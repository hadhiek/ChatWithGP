import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, User, Mail, Calendar, Clock } from "lucide-react";
import RequestActionForm from "./RequestActionForm";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "PROFESSOR") redirect("/");

  const { id } = await params;

  if (!id) notFound();

  const request = await prisma.appointmentRequest.findUnique({
    where: { id },
    include: {
      user: true,
      preferences: {
        include: { availability: true },
        orderBy: { priority: "asc" },
      },
    },
  });

  if (!request) notFound();

  const ordinals = ["①", "②", "③", "④", "⑤"];

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <Link
        href="/admin/requests"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-black mb-6 transition-colors bg-white px-4 py-2 rounded-xl border border-gray-300 shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Requests
      </Link>

      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
            Student / Requester Information
          </h2>
          <div className="flex items-start gap-4">
            <div className="bg-blue-600 rounded-full p-3 text-white flex-shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{request.user.name}</p>
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mt-1">
                <Mail className="h-4 w-4 text-gray-500" /> {request.user.email}
              </p>
              {request.user.department && (
                <p className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-2 border border-blue-200">
                  {request.user.department}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
            Submitted Preferred Dates & Time Slots
          </h2>
          <div className="space-y-3">
            {request.preferences.map((pref, i) => (
              <div
                key={pref.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
                  pref.availability.status === "AVAILABLE"
                    ? "border-gray-300 bg-gray-50 text-gray-900"
                    : "border-gray-200 bg-gray-100 text-gray-500 opacity-75"
                }`}
              >
                <span className="text-2xl font-bold text-blue-700 select-none">
                  {ordinals[i] || `#${pref.priority}`}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-gray-900 text-base">
                      {format(new Date(pref.availability.date), "EEEE, MMMM d, yyyy")}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-0.5 rounded-full">
                      <Clock className="h-3 w-3" />
                      {pref.availability.timeSlot || "General Slot"}
                    </span>
                  </div>
                  <p
                    className={`text-xs font-bold mt-1.5 ${
                      pref.availability.status === "AVAILABLE"
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    Status: {pref.availability.status === "AVAILABLE" ? "Slot Available" : "Already Booked"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reason */}
        {request.reason && (
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 border-b border-gray-100 pb-2">
              Reason / Agenda for Meeting
            </h2>
            <p className="text-gray-900 text-sm font-medium leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-200">
              {request.reason}
            </p>
          </div>
        )}

        {/* Confirmed info banner */}
        {request.confirmedDate && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 flex items-start gap-4">
            <Calendar className="h-6 w-6 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-bold text-emerald-900">
                Appointment Confirmed
              </p>
              <p className="text-sm font-semibold text-emerald-800 mt-1">
                Date: {format(new Date(request.confirmedDate), "EEEE, MMMM d, yyyy")}
              </p>
              {request.confirmedTimeSlot && (
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-4 w-4" /> Time Slot: {request.confirmedTimeSlot}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Form */}
        <RequestActionForm request={request as any} />
      </div>
    </div>
  );
}
