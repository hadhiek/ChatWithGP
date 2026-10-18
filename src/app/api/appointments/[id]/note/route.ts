import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/appointments/[id]/note  — Professor adds/edits note on a confirmed appointment
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "PROFESSOR") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return Response.json({ error: "Appointment ID required" }, { status: 400 });
  }

  try {
    const { professorNote } = (await req.json()) as { professorNote: string };

    const appointment = await prisma.appointmentRequest.findUnique({
      where: { id },
    });

    if (!appointment || appointment.status !== "ACCEPTED") {
      return Response.json(
        { error: "Appointment not found or not confirmed" },
        { status: 404 }
      );
    }

    const updated = await prisma.appointmentRequest.update({
      where: { id },
      data: { professorNote: professorNote?.trim() || null },
    });

    return Response.json(updated);
  } catch (error) {
    console.error("[PATCH /api/appointments/[id]/note]", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
