import { NextResponse } from "next-auth/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const availability = await prisma.availability.findMany({
      where: {
        date: { gte: new Date() }
      },
      orderBy: { date: 'asc' }
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
    const { dates } = await req.json() as { dates: string[] };

    if (!dates || !Array.isArray(dates)) {
      return Response.json({ error: "Invalid data" }, { status: 400 });
    }

    const created = await Promise.all(dates.map(dateString => {
      const date = new Date(dateString);
      return prisma.availability.create({
        data: {
          date,
          professorId: session.user.id
        }
      });
    }));

    return Response.json(created);
  } catch (error) {
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
