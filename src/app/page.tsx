import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { Calendar, Clock, CheckCircle, ArrowRight, User } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-4">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-900 border border-blue-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
          National Institute of Technology Calicut
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 mb-6 max-w-4xl">
          Welcome to <span className="text-blue-600">ChatWithGP</span>
        </h1>
        <p className="max-w-2xl text-base sm:text-lg text-gray-700 font-medium mb-8 leading-relaxed">
          The official NITC appointment portal to schedule one-on-one sessions, project mentoring, and advisory discussions with our Professor of Practice.
        </p>
        <Link
          href="/api/auth/signin"
          className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
        >
          Sign In with NITC Account
        </Link>
      </div>
    );
  }

  if (session.user.role === "ADMIN") redirect("/admin");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (session.user.role === "PROFESSOR") {
    // Professor Dashboard
    const totalAvailable = await prisma.availability.count({
      where: { status: "AVAILABLE", date: { gte: startOfToday } },
    });
    const totalPending = await prisma.appointmentRequest.count({
      where: { status: "PENDING" },
    });
    const totalConfirmed = await prisma.appointmentRequest.count({
      where: { status: "ACCEPTED" },
    });

    const upcomingAvailability = await prisma.availability.findMany({
      where: { date: { gte: startOfToday } },
      orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
      take: 6,
      include: {
        _count: {
          select: {
            preferences: { where: { request: { status: "PENDING" } } },
          },
        },
      },
    });

    return (
      <div className="space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">
              Welcome, Prof. {session.user.name}
            </h1>
            <p className="text-gray-700 font-medium text-sm mt-1">
              Overview of your available time slots and appointment requests.
            </p>
          </div>
          <Link
            href="/admin/availability"
            className="self-start sm:self-auto bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            + Add Available Slots
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/availability"
            className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-200 flex flex-col items-center justify-center hover:border-blue-400 transition-all text-gray-900"
          >
            <span className="text-4xl font-black text-blue-700 mb-1">
              {totalAvailable}
            </span>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Open Time Slots
            </span>
          </Link>
          <Link
            href="/admin/requests"
            className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-200 flex flex-col items-center justify-center hover:border-amber-400 transition-all text-gray-900"
          >
            <span className="text-4xl font-black text-amber-600 mb-1">
              {totalPending}
            </span>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Pending Requests
            </span>
          </Link>
          <Link
            href="/admin/appointments"
            className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-200 flex flex-col items-center justify-center hover:border-emerald-400 transition-all text-gray-900"
          >
            <span className="text-4xl font-black text-emerald-700 mb-1">
              {totalConfirmed}
            </span>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Confirmed Appointments
            </span>
          </Link>
        </div>

        {/* Upcoming Availability Overview */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden text-gray-900">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Upcoming Available Slots
            </h2>
            <Link
              href="/admin/availability"
              className="text-sm font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              Manage all &rarr;
            </Link>
          </div>

          <ul className="divide-y-2 divide-gray-100">
            {upcomingAvailability.length === 0 ? (
              <li className="p-8 text-center text-gray-600 font-medium text-sm">
                No upcoming slots published. Click &ldquo;+ Add Available Slots&rdquo; to publish your calendar.
              </li>
            ) : (
              upcomingAvailability.map((a) => (
                <li
                  key={a.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="font-bold text-gray-900 text-base">
                      {format(new Date(a.date), "EEEE, MMMM d, yyyy")}
                    </span>
                    <span className="ml-3 inline-flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-950 border border-blue-300 px-2.5 py-0.5 rounded-md">
                      <Clock className="h-3 w-3" />
                      {a.timeSlot || "General Slot"}
                    </span>
                  </div>

                  <span
                    className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                      a.status === "AVAILABLE"
                        ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                        : "bg-blue-100 text-blue-950 border-blue-300"
                    }`}
                  >
                    {a.status === "AVAILABLE"
                      ? a._count.preferences > 0
                        ? `${a._count.preferences} pending request(s)`
                        : "Available"
                      : a.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    );
  }

  // Student / Faculty User Dashboard
  const availableSlotsCount = await prisma.availability.count({
    where: { status: "AVAILABLE", date: { gte: startOfToday } },
  });

  const myRequests = await prisma.appointmentRequest.findMany({
    where: { userId: session.user.id, status: "PENDING" },
    include: {
      preferences: {
        include: { availability: true },
        orderBy: { priority: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const myAppointments = await prisma.appointmentRequest.findMany({
    where: { userId: session.user.id, status: "ACCEPTED" },
    orderBy: { confirmedDate: "asc" },
    take: 3,
  });

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3 border border-white/20">
            NITC Professor of Practice
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mb-2">
            Schedule Your Next Discussion
          </h1>
          <p className="text-blue-100 font-medium text-sm sm:text-base max-w-xl">
            {availableSlotsCount} open time slots are currently available on the professor&apos;s calendar.
          </p>
        </div>
        <Link
          href="/availability"
          className="self-start md:self-auto bg-white text-blue-800 px-7 py-3.5 rounded-xl font-black hover:bg-blue-50 transition-colors shadow-lg text-sm sm:text-base flex-shrink-0"
        >
          Book an Appointment &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Requests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              My Pending Requests
              {myRequests.length > 0 && (
                <span className="bg-amber-100 text-amber-950 border border-amber-300 text-xs px-2.5 py-0.5 rounded-full font-black">
                  {myRequests.length}
                </span>
              )}
            </h2>
            <Link
              href="/requests"
              className="text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              View all
            </Link>
          </div>

          {myRequests.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 p-8 rounded-2xl text-center text-gray-600 font-medium text-sm">
              You have no pending requests right now.
            </div>
          ) : (
            myRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border-2 border-gray-200 p-5 rounded-2xl shadow-sm text-gray-900"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 text-base">
                    {req.reason || "General Discussion"}
                  </h3>
                  <span className="bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black px-2.5 py-0.5 rounded-full uppercase">
                    PENDING
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {req.preferences.map((pref) => (
                    <span
                      key={pref.id}
                      className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-800 flex items-center gap-1.5"
                    >
                      <span>{format(new Date(pref.availability.date), "MMM d")}</span>
                      <span className="text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-extrabold text-[11px]">
                        {pref.availability.timeSlot || "Slot"}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Confirmed Appointments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              My Confirmed Appointments
            </h2>
            <Link
              href="/requests"
              className="text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              View all
            </Link>
          </div>

          {myAppointments.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 p-8 rounded-2xl text-center text-gray-600 font-medium text-sm">
              You have no confirmed appointments yet.
            </div>
          ) : (
            myAppointments.map((appt) => (
              <div
                key={appt.id}
                className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-2xl shadow-sm text-emerald-950"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-black text-emerald-950 text-base">
                      {appt.confirmedDate
                        ? format(new Date(appt.confirmedDate), "EEEE, MMMM d, yyyy")
                        : "Confirmed"}
                    </h3>
                    {appt.confirmedTimeSlot && (
                      <p className="text-xs font-extrabold text-emerald-800 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3.5 w-3.5" /> Time: {appt.confirmedTimeSlot}
                      </p>
                    )}
                  </div>
                  <span className="bg-emerald-200 text-emerald-950 border border-emerald-400 text-xs font-black px-2.5 py-0.5 rounded-full uppercase">
                    CONFIRMED
                  </span>
                </div>
                {appt.reason && (
                  <p className="text-xs text-emerald-900 font-medium mt-1">
                    Topic: {appt.reason}
                  </p>
                )}
                {appt.professorNote && (
                  <div className="mt-3 text-xs bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-emerald-950 font-medium">
                    <span className="font-bold">Professor Note: </span>
                    {appt.professorNote}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
