import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Calendar, User, Clock, Mail } from "lucide-react";

export default async function ProfessorAppointmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "PROFESSOR") redirect("/");

  const appointments = await prisma.appointmentRequest.findMany({
    where: { status: "ACCEPTED" },
    include: { user: true },
    orderBy: { confirmedDate: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Confirmed Appointments
        </h1>
        <p className="text-gray-700 text-sm mt-1.5 font-medium">
          All finalized scheduled appointments with students and faculty.
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-600 font-medium text-base">
          No confirmed appointments scheduled yet.
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 text-gray-900"
            >
              <div className="flex items-start gap-4">
                <div className="bg-emerald-600 text-white rounded-2xl p-3.5 flex-shrink-0 shadow-sm">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold text-gray-900">
                      {appt.confirmedDate
                        ? format(new Date(appt.confirmedDate), "EEEE, MMMM d, yyyy")
                        : "Date not set"}
                    </p>
                    {appt.confirmedTimeSlot && (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-950 border border-blue-300 text-xs font-black px-2.5 py-1 rounded-full">
                        <Clock className="h-3.5 w-3.5 text-blue-700" />
                        {appt.confirmedTimeSlot}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mt-1.5">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{appt.user.name}</span>
                    <span className="text-gray-400">&bull;</span>
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{appt.user.email}</span>
                  </div>

                  {appt.reason && (
                    <p className="text-xs font-medium text-gray-600 mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Meeting Topic: </span>
                      {appt.reason}
                    </p>
                  )}

                  {appt.professorNote && (
                    <p className="text-xs font-medium text-amber-900 mt-1.5 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      <span className="font-bold">Your Note: </span>
                      {appt.professorNote}
                    </p>
                  )}
                </div>
              </div>

              <span className="self-start sm:self-center bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-black px-3.5 py-1.5 rounded-full flex-shrink-0 uppercase tracking-wider">
                CONFIRMED
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
