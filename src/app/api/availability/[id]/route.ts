import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "PROFESSOR") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const availability = await prisma.availability.findUnique({ where: { id } });

    if (!availability) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (availability.status === "BOOKED") {
      return Response.json({ error: "Cannot remove a booked date." }, { status: 400 });
    }

    // Delete any preferences referencing this availability first
    await prisma.requestPreference.deleteMany({
      where: { availabilityId: id },
    });

    await prisma.availability.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
