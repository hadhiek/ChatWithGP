import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Clock, Calendar, User, ArrowRight } from "lucide-react";

export default async function ProfessorRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "PROFESSOR") redirect("/");

  const { status } = await searchParams;
  const filterStatus = status || "PENDING";

  const rawRequests = await prisma.appointmentRequest.findMany({
    where: { status: filterStatus },
    include: {
      user: true,
      preferences: {
        include: { availability: true },
        orderBy: { priority: "asc" },
      },
    },
  });

  // Sort by the date of the #1 preferred slot (chronologically), then by submission time
  const requests = rawRequests.sort((a, b) => {
    const aDate = a.preferences[0]?.availability?.date
      ? new Date(a.preferences[0].availability.date).getTime()
      : new Date(a.createdAt).getTime();
    const bDate = b.preferences[0]?.availability?.date
      ? new Date(b.preferences[0].availability.date).getTime()
      : new Date(b.createdAt).getTime();
    if (aDate !== bDate) return aDate - bDate;
    // Secondary sort: slot time alphabetically (e.g. "09:00 AM" < "10:00 AM")
    const aSlot = a.preferences[0]?.availability?.timeSlot || "";
    const bSlot = b.preferences[0]?.availability?.timeSlot || "";
    return aSlot.localeCompare(bSlot);
  });


  const tabs = [
    { label: "Pending", value: "PENDING" },
    { label: "Accepted", value: "ACCEPTED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  const statusBadgeStyles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-950 border border-amber-300",
    ACCEPTED: "bg-emerald-100 text-emerald-950 border border-emerald-300",
    REJECTED: "bg-red-100 text-red-950 border border-red-300",
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Appointment Requests
        </h1>
        <p className="text-gray-700 text-sm mt-1.5 font-medium">
          Review, accept or decline booking requests submitted by students and faculty.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-200 mb-8">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/requests?status=${tab.value}`}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors -mb-[2px] ${
              filterStatus === tab.value
                ? "border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl"
                : "border-transparent text-gray-600 hover:text-gray-950 hover:bg-gray-50 rounded-t-xl"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Request List */}
      {requests.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-600 font-medium text-base">
          No {filterStatus.toLowerCase()} requests at the moment.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm hover:border-gray-300 transition-all text-gray-900"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 border-b border-gray-100 pb-4">
                <div>
                  <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    {req.user.name}
                  </p>
                  <p className="text-sm font-semibold text-gray-600 mt-0.5">
                    {req.user.email}
                    {req.user.department ? ` • ${req.user.department}` : ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Submitted: {format(new Date(req.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <span
                  className={`self-start text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    statusBadgeStyles[req.status] || "bg-gray-100 text-gray-900"
                  }`}
                >
                  {req.status}
                </span>
              </div>

              {/* Preferences */}
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Requested Time Slots
                </p>
                <div className="flex flex-wrap gap-2">
                  {req.preferences.map((pref) => (
                    <span
                      key={pref.id}
                      className="inline-flex items-center gap-2 bg-gray-50 border-2 border-gray-200 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-xl"
                    >
                      <span className="text-blue-700 font-black">
                        #{pref.priority}
                      </span>
                      <span>
                        {format(new Date(pref.availability.date), "EEE, MMM d")}
                      </span>
                      <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md text-[11px] font-extrabold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {pref.availability.timeSlot || "General Slot"}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Reason */}
              {req.reason && (
                <div className="mb-4 p-3.5 bg-gray-50 rounded-xl text-sm text-gray-900 border border-gray-200 font-medium">
                  <span className="font-bold text-gray-900">Reason: </span>
                  {req.reason}
                </div>
              )}

              {/* Confirmed Details */}
              {req.confirmedDate && (
                <div className="mb-4 p-3.5 bg-emerald-50 rounded-xl text-sm text-emerald-950 border border-emerald-300 font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-700 flex-shrink-0" />
                  <span>
                    Confirmed: {format(new Date(req.confirmedDate), "EEEE, MMMM d, yyyy")}
                    {req.confirmedTimeSlot ? ` • ${req.confirmedTimeSlot}` : ""}
                  </span>
                </div>
              )}

              {/* Professor Note */}
              {req.professorNote && (
                <div className="mb-4 p-3.5 bg-amber-50 rounded-xl text-sm text-amber-950 border border-amber-300 font-medium">
                  <span className="font-bold">Your Note: </span>
                  {req.professorNote}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Link
                  href={`/admin/requests/${req.id}`}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm bg-gray-900 text-white rounded-xl hover:bg-black font-bold transition-colors shadow-sm"
                >
                  Review Request <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
