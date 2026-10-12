import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    if (action === "ACCEPT" && !availabilityId) {
      return Response.json({ error: "Must select a time slot to confirm" }, { status: 400 });
    }

    const request = await prisma.appointmentRequest.findUnique({
      where: { id },
      include: {
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
        // Double check availability is still available
        const availability = await tx.availability.findUnique({ where: { id: availabilityId! } });
        if (!availability || availability.status !== "AVAILABLE") {
          throw new Error("Selected time slot is no longer available");
        }

        // Mark availability as booked
        await tx.availability.update({
          where: { id: availabilityId! },
          data: { status: "BOOKED" }
        });

        // Accept request
        return tx.appointmentRequest.update({
          where: { id },
          data: {
            status: "ACCEPTED",
            confirmedDate: availability.date,
            confirmedTimeSlot: availability.timeSlot,
            professorNote
          }
        });
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
  } catch (error: any) {
    return Response.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
