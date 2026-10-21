import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { CalendarDays, Clock3, GraduationCap, Users, ClipboardList, CheckCircle2 } from "lucide-react";

function StatCard({ label, value, icon: Icon, tone }: {
  label: string;
  value: number;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-600">{label}</p>
        <span className={`rounded-xl p-2 ${tone}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-3xl font-black text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}

function dateLabel(value: Date | null) {
  return value ? format(new Date(value), "dd MMM yyyy") : "Not scheduled";
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "ADMIN") redirect("/");

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const [students, totalRequests, pendingRequests, confirmedAppointments, allRequests, upcomingAppointments] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: { notIn: ["PROFESSOR", "ADMIN"] } },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        include: { _count: { select: { requests: true } } },
      }),
      prisma.appointmentRequest.count(),
      prisma.appointmentRequest.count({ where: { status: "PENDING" } }),
      prisma.appointmentRequest.count({ where: { status: "ACCEPTED" } }),
      prisma.appointmentRequest.findMany({
        orderBy: [{ createdAt: "desc" }],
        include: {
          user: { select: { name: true, email: true, department: true } },
          preferences: {
            orderBy: { priority: "asc" },
            include: { availability: { select: { date: true, timeSlot: true } } },
          },
        },
      }),
      prisma.appointmentRequest.findMany({
        where: { status: "ACCEPTED", confirmedDate: { gte: today } },
        orderBy: [{ confirmedDate: "asc" }, { confirmedTimeSlot: "asc" }],
        include: {
          user: { select: { name: true, email: true, department: true } },
        },
      }),
    ]);

  const studentsWithRequests = students.filter((student) => student._count.requests > 0).length;

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">System administration</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">Admin Overview</h1>
          <p className="mt-2 text-sm text-gray-600">A system-wide view of students, appointment requests, and confirmed sessions.</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900">
          Signed in as {session.user.name || session.user.email || "Admin"}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students / users" value={students.length} icon={Users} tone="bg-blue-50 text-blue-700" />
        <StatCard label="Total requests" value={totalRequests} icon={ClipboardList} tone="bg-indigo-50 text-indigo-700" />
        <StatCard label="Pending requests" value={pendingRequests} icon={Clock3} tone="bg-amber-50 text-amber-700" />
        <StatCard label="Confirmed appointments" value={confirmedAppointments} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
      </section>

      <section id="appointments" className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Upcoming appointments</h2>
            <p className="text-sm text-gray-600">Confirmed sessions, ordered by date and time.</p>
          </div>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{upcomingAppointments.length} upcoming</span>
        </div>
        {upcomingAppointments.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">There are no upcoming confirmed appointments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr><th className="px-5 py-3">Date & time</th><th className="px-5 py-3">Student</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Topic</th><th className="px-5 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">
                      {dateLabel(appointment.confirmedDate)}
                      <div className="mt-1 flex items-center gap-1 text-xs font-normal text-gray-500"><Clock3 className="h-3 w-3" />{appointment.confirmedTimeSlot || "Time not set"}</div>
                    </td>
                    <td className="px-5 py-4"><div className="font-semibold text-gray-900">{appointment.user.name || "Unnamed user"}</div><div className="text-xs text-gray-500">{appointment.user.email || "No email"}</div></td>
                    <td className="px-5 py-4 text-gray-600">{appointment.user.department || "—"}</td>
                    <td className="px-5 py-4 text-gray-700">{appointment.reason || "General discussion"}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">ACCEPTED</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-bold text-gray-900">All appointment requests</h2>
          <p className="text-sm text-gray-600">Newest requests first, including pending, accepted, rejected, and cancelled requests.</p>
        </div>
        {allRequests.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">No appointment requests have been submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Student</th><th className="px-5 py-3">Preferences</th><th className="px-5 py-3">Confirmed slot</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Professor note</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allRequests.map((request) => (
                  <tr key={request.id} className="align-top hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-4 text-gray-700">{format(new Date(request.createdAt), "dd MMM yyyy, h:mm a")}</td>
                    <td className="px-5 py-4"><div className="font-semibold text-gray-900">{request.user.name || "Unnamed user"}</div><div className="text-xs text-gray-500">{request.user.email || "No email"}</div><div className="text-xs text-gray-500">{request.user.department || "Department not set"}</div></td>
                    <td className="px-5 py-4 text-gray-700">
                      {request.preferences.length ? request.preferences.map((preference) => (
                        <div key={preference.id} className="mb-1 whitespace-nowrap text-xs">
                          <span className="font-bold">#{preference.priority}</span> {format(new Date(preference.availability.date), "dd MMM yyyy")} · {preference.availability.timeSlot || "General slot"}
                        </div>
                      )) : "—"}
                      {request.reason && <p className="mt-2 max-w-xs whitespace-normal text-xs text-gray-500">Reason: {request.reason}</p>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                      {request.confirmedDate ? <>{format(new Date(request.confirmedDate), "dd MMM yyyy")}<div className="mt-1 text-xs text-gray-500">{request.confirmedTimeSlot || "Time not set"}</div></> : "—"}
                    </td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      request.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-800" :
                      request.status === "PENDING" ? "bg-amber-50 text-amber-800" :
                      "bg-gray-100 text-gray-700"
                    }`}>{request.status}</span></td>
                    <td className="max-w-xs whitespace-normal px-5 py-4 text-gray-600">{request.professorNote || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="students" className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><GraduationCap className="h-5 w-5 text-blue-700" />Student directory</h2>
            <p className="text-sm text-gray-600">Registered non-admin, non-professor users and their request activity.</p>
          </div>
          <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{studentsWithRequests} with requests</span>
        </div>
        {students.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">No student accounts found yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Requests</th><th className="px-5 py-3">Last activity</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student) => {
                  const latestRequest = allRequests.find((request) => request.userId === student.id);
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-semibold text-gray-900">{student.name || "Unnamed user"}</td>
                      <td className="px-5 py-4 text-gray-600">{student.email || "—"}</td>
                      <td className="px-5 py-4 text-gray-600">{student.department || "—"}</td>
                      <td className="px-5 py-4 text-gray-700">{student._count.requests}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">{latestRequest ? format(new Date(latestRequest.createdAt), "dd MMM yyyy") : "No requests yet"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="flex items-center gap-2 text-xs text-gray-500"><CalendarDays className="h-4 w-4" />Dashboard data is read-only; appointment decisions and availability changes remain in the Professor of Practice workflow.</p>
    </div>
  );
}
