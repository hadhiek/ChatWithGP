import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format, isBefore, startOfDay } from "date-fns";
import { Calendar, User, Clock, Mail } from "lucide-react";
import AppointmentNoteEditor from "./AppointmentNoteEditor";

export default async function ProfessorAppointmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "PROFESSOR") redirect("/");

  // Fetch ALL confirmed appointments (past + upcoming), sorted chronologically
  const appointments = await prisma.appointmentRequest.findMany({
    where: { status: "ACCEPTED" },
    include: { user: true },
    orderBy: [
      { confirmedDate: "asc" },
      { confirmedTimeSlot: "asc" },
    ],
  });

  const todayStart = startOfDay(new Date());

  const upcoming = appointments.filter(
    (a) => a.confirmedDate && !isBefore(new Date(a.confirmedDate), todayStart)
  );
  const past = appointments.filter(
    (a) => a.confirmedDate && isBefore(new Date(a.confirmedDate), todayStart)
  );

  const AppointmentCard = ({
    appt,
    isPast,
  }: {
    appt: (typeof appointments)[0];
    isPast?: boolean;
  }) => (
    <div
      className={`bg-white border-2 rounded-2xl p-6 shadow-sm text-gray-900 transition-all ${
        isPast ? "border-gray-200 opacity-80" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left: Date + Time + Person */}
        <div className="flex items-start gap-4">
          <div
            className={`rounded-2xl p-3.5 flex-shrink-0 shadow-sm ${
              isPast ? "bg-gray-200 text-gray-700" : "bg-emerald-600 text-white"
            }`}
          >
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

            <div className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-gray-700 mt-1.5">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4 text-gray-500" />
                {appt.user.name}
              </span>
              <span className="text-gray-400">&bull;</span>
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-gray-500" />
                {appt.user.email}
              </span>
            </div>

            {appt.reason && (
              <p className="text-xs font-medium text-gray-600 mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <span className="font-bold text-gray-800">Topic: </span>
                {appt.reason}
              </p>
            )}

            {/* Editable Note */}
            <AppointmentNoteEditor
              appointmentId={appt.id}
              initialNote={appt.professorNote}
            />
          </div>
        </div>

        {/* Right: Status badge */}
        <span
          className={`self-start flex-shrink-0 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider border ${
            isPast
              ? "bg-gray-100 text-gray-700 border-gray-300"
              : "bg-emerald-100 text-emerald-950 border-emerald-300"
          }`}
        >
          {isPast ? "PAST" : "UPCOMING"}
        </span>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Confirmed Appointments
        </h1>
        <p className="text-gray-700 text-sm mt-1.5 font-medium">
          All scheduled appointments, ordered chronologically. You can add or edit notes on any appointment.
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-600 font-medium text-base">
          No confirmed appointments yet.
        </div>
      ) : (
        <div className="space-y-10">
          {/* Upcoming */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Upcoming ({upcoming.length})
              </h2>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
            {upcoming.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-500 font-medium text-sm">
                No upcoming appointments scheduled.
              </div>
            ) : (
              <div className="space-y-4">
                {upcoming.map((appt) => (
                  <AppointmentCard key={appt.id} appt={appt} isPast={false} />
                ))}
              </div>
            )}
          </section>

          {/* Past */}
          {past.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-gray-700">
                  Past ({past.length})
                </h2>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="space-y-4">
                {past
                  .slice()
                  .reverse() // most recent past first
                  .map((appt) => (
                    <AppointmentCard key={appt.id} appt={appt} isPast />
                  ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
