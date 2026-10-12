import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Clock, CheckCircle, XCircle, AlertCircle, Calendar } from "lucide-react";

export default async function StudentRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const requests = await prisma.appointmentRequest.findMany({
    where: { userId: session.user.id },
    include: {
      preferences: {
        include: { availability: true },
        orderBy: { priority: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusConfig: Record<
    string,
    { icon: React.ReactNode; color: string; bg: string; border: string }
  > = {
    PENDING: {
      icon: <Clock className="h-4 w-4" />,
      color: "text-amber-950",
      bg: "bg-amber-100",
      border: "border-amber-300",
    },
    ACCEPTED: {
      icon: <CheckCircle className="h-4 w-4" />,
      color: "text-emerald-950",
      bg: "bg-emerald-100",
      border: "border-emerald-300",
    },
    REJECTED: {
      icon: <XCircle className="h-4 w-4" />,
      color: "text-red-950",
      bg: "bg-red-100",
      border: "border-red-300",
    },
    CANCELLED: {
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-gray-900",
      bg: "bg-gray-100",
      border: "border-gray-300",
    },
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            My Appointment Requests
          </h1>
          <p className="text-gray-700 text-sm mt-1.5 font-medium">
            Track the status of your appointment requests with the Professor of Practice.
          </p>
        </div>
        <Link
          href="/availability"
          className="self-start sm:self-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
        >
          + New Request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <div className="bg-blue-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center text-blue-600">
            <Clock className="h-8 w-8" />
          </div>
          <p className="text-gray-900 font-bold text-lg mb-1">
            No appointment requests submitted yet
          </p>
          <p className="text-gray-600 text-sm mb-6">
            Check the professor's calendar and book your preferred time slot.
          </p>
          <Link
            href="/availability"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md"
          >
            Browse Available Slots &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const cfg = statusConfig[req.status] || statusConfig.PENDING;
            return (
              <div
                key={req.id}
                className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm hover:border-gray-300 transition-all text-gray-900"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4 border-b border-gray-100 pb-3">
                  <div>
                    <p className="font-bold text-lg text-gray-900">
                      {req.reason || "General Discussion"}
                    </p>
                    <p className="text-xs font-semibold text-gray-500 mt-0.5">
                      Submitted on {format(new Date(req.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                  >
                    {cfg.icon}
                    {req.status}
                  </span>
                </div>

                {/* Confirmed Slot if ACCEPTED */}
                {req.status === "ACCEPTED" && req.confirmedDate && (
                  <div className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-300 flex items-start gap-3 mb-4">
                    <CheckCircle className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                        Confirmed Appointment
                      </p>
                      <p className="text-sm font-bold text-emerald-900 mt-0.5">
                        {format(new Date(req.confirmedDate), "EEEE, MMMM d, yyyy")}
                      </p>
                      {req.confirmedTimeSlot && (
                        <p className="text-xs font-extrabold text-emerald-800 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3.5 w-3.5" />
                          Time Slot: {req.confirmedTimeSlot}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Preferred Dates & Time Slots */}
                <div className="mb-4">
                  <p className="text-xs text-gray-800 uppercase font-black tracking-wider mb-2">
                    Your Selected Preferences
                  </p>
                  <div className="space-y-2">
                    {req.preferences.map((pref) => (
                      <div
                        key={pref.id}
                        className="flex flex-wrap items-center gap-2 text-sm bg-gray-50 p-2.5 rounded-xl border border-gray-200"
                      >
                        <span className="text-xs font-black text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-md">
                          Preference #{pref.priority}
                        </span>
                        <span className="font-bold text-gray-900">
                          {format(new Date(pref.availability.date), "EEEE, MMMM d, yyyy")}
                        </span>
                        <span className="bg-gray-200 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-600" />
                          {pref.availability.timeSlot || "General Slot"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Professor Note */}
                {req.professorNote && (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 text-sm text-amber-950 font-medium">
                    <span className="font-black">Note from Professor: </span>
                    {req.professorNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
