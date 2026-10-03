import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { reason, preferences } = await req.json() as { 
      reason: string; 
      preferences: { availabilityId: string; priority: number }[] 
    };

    if (!preferences || preferences.length === 0 || preferences.length > 3) {
      return Response.json({ error: "Invalid preferences" }, { status: 400 });
    }

    // Verify all availabilities are actually AVAILABLE
    const availabilityIds = preferences.map(p => p.availabilityId);
    const availabilities = await prisma.availability.findMany({
      where: { id: { in: availabilityIds }, status: 'AVAILABLE' }
    });

    if (availabilities.length !== availabilityIds.length) {
      return Response.json({ error: "Some dates are no longer available" }, { status: 400 });
    }

    // Use transaction to create request and preferences safely
    const request = await prisma.$transaction(async (tx) => {
      const newReq = await tx.appointmentRequest.create({
        data: {
          userId: session.user.id,
          reason,
          status: 'PENDING',
          preferences: {
            create: preferences.map(p => ({
              availabilityId: p.availabilityId,
              priority: p.priority
            }))
          }
        },
        include: { preferences: true }
      });
      return newReq;
    });

    return Response.json(request);
  } catch (error) {
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
