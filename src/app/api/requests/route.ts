import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only regular users (students/faculty) may submit booking requests.
  if (session.user.role === "PROFESSOR" || session.user.role === "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { reason, preferences } = await req.json() as {
      reason: string;
      preferences: { availabilityId: string; priority: number }[];
    };

    if (
      !Array.isArray(preferences) ||
      preferences.length === 0 ||
      preferences.length > 3 ||
      new Set(preferences.map((p) => p.availabilityId)).size !== preferences.length ||
      preferences.some((p) => !p.availabilityId || ![1, 2, 3].includes(p.priority))
    ) {
      return Response.json(
        { error: "You must select 1 to 3 preferred time slots." },
        { status: 400 }
      );
    }

    // ── BLOCK multiple concurrent requests ──
    // A student can only have ONE active (PENDING) request at a time.
    const existingPending = await prisma.appointmentRequest.findFirst({
      where: { userId: session.user.id, status: "PENDING" },
    });

    if (existingPending) {
      return Response.json(
        {
          error:
            "You already have a pending appointment request. Please wait for the professor to respond before submitting a new one.",
        },
        { status: 409 }
      );
    }

    // ── Verify all selected slots are still AVAILABLE ──
    const availabilityIds = preferences.map((p) => p.availabilityId);
    const availabilities = await prisma.availability.findMany({
      where: { id: { in: availabilityIds }, status: "AVAILABLE" },
    });

    if (availabilities.length !== availabilityIds.length) {
      return Response.json(
        { error: "One or more of the selected time slots are no longer available. Please refresh and try again." },
        { status: 400 }
      );
    }

    // ── Create request in a transaction ──
    const request = await prisma.$transaction(async (tx) => {
      return tx.appointmentRequest.create({
        data: {
          userId: session.user.id,
          reason,
          status: "PENDING",
          preferences: {
            create: preferences.map((p) => ({
              availabilityId: p.availabilityId,
              priority: p.priority,
            })),
          },
        },
        include: { preferences: true },
      });
    });

    return Response.json(request);
  } catch (error) {
    console.error("[POST /api/requests]", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
