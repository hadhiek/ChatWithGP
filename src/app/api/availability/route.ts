import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const availability = await prisma.availability.findMany({
      where: {
        date: { gte: startOfToday }
      },
      orderBy: [
        { date: 'asc' },
        { timeSlot: 'asc' }
      ]
    });

    return Response.json(availability);
  } catch (error) {
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== "PROFESSOR") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Support either structured slots array or simple dates array
    let slotsToCreate: { date: Date; timeSlot: string }[] = [];

    if (Array.isArray(body.slots)) {
      slotsToCreate = body.slots.map((s: { date: string; timeSlot?: string }) => ({
        date: new Date(s.date),
        timeSlot: s.timeSlot?.trim() || "10:00 AM - 11:00 AM",
      }));
    } else if (Array.isArray(body.dates)) {
      const defaultTimeSlot = body.timeSlot?.trim() || "10:00 AM - 11:00 AM";
      slotsToCreate = body.dates.map((dateString: string) => ({
        date: new Date(dateString),
        timeSlot: defaultTimeSlot,
      }));
    } else {
      return Response.json({ error: "Invalid slot data" }, { status: 400 });
    }

    if (slotsToCreate.length === 0) {
      return Response.json({ error: "No slots provided" }, { status: 400 });
    }

    const created = await Promise.all(
      slotsToCreate.map(slot =>
        prisma.availability.create({
          data: {
            date: slot.date,
            timeSlot: slot.timeSlot,
            professorId: session.user.id,
            status: "AVAILABLE",
          }
        })
      )
    );

    return Response.json(created);
  } catch (error) {
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
