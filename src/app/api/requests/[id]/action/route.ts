import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== "PROFESSOR") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return Response.json({ error: "Request ID is required" }, { status: 400 });
  }

  try {
    const { action, availabilityId, professorNote } = await req.json() as { 
      action: "ACCEPT" | "REJECT"; 
      availabilityId?: string;
      professorNote?: string;
    };

    if (action !== "ACCEPT" && action !== "REJECT") {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "ACCEPT" && !availabilityId) {
      return Response.json({ error: "Must select a time slot to confirm" }, { status: 400 });
    }

    const request = await prisma.appointmentRequest.findUnique({
      where: { id },
      include: {
        user: true,
        preferences: {
          include: { availability: true }
        }
      }
    });

    if (!request || request.status !== "PENDING") {
      return Response.json({ error: "Request not found or already processed" }, { status: 400 });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      if (action === "ACCEPT") {
        // A professor may only confirm one of the slots the student actually requested.
        const isPreferredSlot = request.preferences.some(
          (preference) => preference.availabilityId === availabilityId
        );
        if (!isPreferredSlot) {
          throw new Error("Selected time slot was not requested by this student");
        }

        // Atomically claim the slot. Concurrent requests cannot both book it.
        const claimed = await tx.availability.updateMany({
          where: { id: availabilityId!, status: "AVAILABLE" },
          data: { status: "BOOKED" },
        });
        if (claimed.count !== 1) {
          throw new Error("Selected time slot is no longer available");
        }

        const availability = await tx.availability.findUnique({
          where: { id: availabilityId! },
        });
        if (!availability) {
          throw new Error("Selected time slot no longer exists");
        }

        // Accept request
        const updated = await tx.appointmentRequest.update({
          where: { id },
          data: {
            status: "ACCEPTED",
            confirmedDate: availability.date,
            confirmedTimeSlot: availability.timeSlot,
            professorNote
          }
        });

        // Queue the email atomically with appointment confirmation.
        if (request.user.email) {
          const studentName = request.user.name || "there";
          const date = availability.date.toLocaleDateString("en-IN", {
            dateStyle: "full",
            timeZone: process.env.APPOINTMENT_TIME_ZONE || "Asia/Kolkata",
          });
          const timeSlot = availability.timeSlot || "Please contact the Professor for the time";
          const note = professorNote?.trim();
          const subject = "Your Professor of Practice appointment is confirmed";
          const text = ["Hello " + studentName + ",", "", "Your appointment with the Professor of Practice has been confirmed.", "Date: " + date, "Time: " + timeSlot, note ? "Note from the professor: " + note : "", "", "Please keep this email for your reference.", "ChatWithGP"].filter(Boolean).join("\n");
          const html = '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Appointment confirmed</h2><p>Hello ' + escapeHtml(studentName) + ',</p><p>Your appointment with the Professor of Practice has been confirmed.</p><p><strong>Date:</strong> ' + escapeHtml(date) + '<br/><strong>Time:</strong> ' + escapeHtml(timeSlot) + '</p>' + (note ? '<p><strong>Note from the professor:</strong> ' + escapeHtml(note) + '</p>' : "") + '<p>Please keep this email for your reference.</p><p>ChatWithGP</p></div>';
          await tx.emailOutbox.create({ data: { requestId: id, eventType: "APPOINTMENT_CONFIRMED", recipient: request.user.email, subject, html, text } });
        }
        return updated;
      } else {
        // Reject request
        return tx.appointmentRequest.update({
          where: { id },
          data: {
            status: "REJECTED",
            professorNote
          }
        });
      }
    });

    return Response.json(updatedRequest);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const isExpectedConflict =
      message === "Selected time slot is no longer available" ||
      message === "Selected time slot was not requested by this student" ||
      message === "Selected time slot no longer exists";
    return Response.json(
      { error: message },
      { status: isExpectedConflict ? 409 : 500 }
    );
  }
}
