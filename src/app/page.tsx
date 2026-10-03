import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl mb-6">
          Welcome to <span className="text-blue-600">ChatWithGP</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl mb-8">
          The official NITC portal to schedule appointments with our Professor of Practice.
        </p>
        <Link
          href="/api/auth/signin"
          className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-colors shadow-lg hover:shadow-xl"
        >
          Sign In with NITC Account
        </Link>
      </div>
    );
  }

  if (session.user.role === "PROFESSOR") {
    // Admin Dashboard
    const totalAvailable = await prisma.availability.count({ where: { status: "AVAILABLE" } });
    const totalPending = await prisma.appointmentRequest.count({ where: { status: "PENDING" } });
    const totalConfirmed = await prisma.appointmentRequest.count({ where: { status: "ACCEPTED" } });

    const upcomingAvailability = await prisma.availability.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5,
      include: {
        _count: { select: { preferences: { where: { request: { status: 'PENDING' } } } } }
      }
    });

    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Good morning, Prof. {session.user.name}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-blue-600 mb-2">{totalAvailable}</span>
            <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Available Dates</span>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-amber-500 mb-2">{totalPending}</span>
            <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Pending Requests</span>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-emerald-600 mb-2">{totalConfirmed}</span>
            <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Confirmed</span>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4">Upcoming Availability Overview</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {upcomingAvailability.length === 0 ? (
              <li className="p-6 text-center text-gray-500">No upcoming availability published.</li>
            ) : (
              upcomingAvailability.map(a => (
                <li key={a.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-gray-900">{format(a.date, 'MMMM d, yyyy')}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    a.status === 'AVAILABLE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {a.status === 'AVAILABLE' ? (a._count.preferences > 0 ? `${a._count.preferences} requests` : 'Available') : a.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    );
  }

  // Normal User Dashboard
  const availableDatesCount = await prisma.availability.count({ where: { status: "AVAILABLE", date: { gte: new Date() } } });
  
  const myRequests = await prisma.appointmentRequest.findMany({
    where: { userId: session.user.id, status: 'PENDING' },
    include: {
      preferences: {
        include: { availability: true },
        orderBy: { priority: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const myAppointments = await prisma.appointmentRequest.findMany({
    where: { userId: session.user.id, status: 'ACCEPTED' },
    orderBy: { confirmedDate: 'asc' }
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Welcome back, {session.user.name?.split(' ')[0]}</h1>
      
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg mb-10 flex flex-col md:flex-row items-center justify-between">
        <div>
          <h2 className="text-xl text-blue-100 mb-1">Professor of Practice</h2>
          <p className="text-2xl font-semibold mb-2">Schedule an Appointment</p>
          <p className="text-blue-200">{availableDatesCount} available dates currently open.</p>
        </div>
        <Link href="/availability" className="mt-6 md:mt-0 bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md">
          View Availability
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            My Pending Requests
            {myRequests.length > 0 && <span className="ml-3 bg-amber-100 text-amber-800 text-xs py-1 px-2.5 rounded-full font-bold">{myRequests.length}</span>}
          </h2>
          
          <div className="space-y-4">
            {myRequests.length === 0 ? (
              <div className="bg-white border border-gray-100 p-8 rounded-xl text-center shadow-sm text-gray-500">
                You have no pending requests.
              </div>
            ) : (
              myRequests.map(req => (
                <div key={req.id} className="bg-white border border-gray-100 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium text-gray-900 truncate max-w-[70%]">{req.reason || "General Discussion"}</h3>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded">PENDING</span>
                  </div>
                  <div className="text-sm text-gray-500 flex flex-wrap gap-2">
                    {req.preferences.map(pref => (
                      <span key={pref.id} className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        {format(pref.availability.date, 'MMM d')}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">My Appointments</h2>
          
          <div className="space-y-4">
            {myAppointments.length === 0 ? (
              <div className="bg-white border border-gray-100 p-8 rounded-xl text-center shadow-sm text-gray-500">
                You have no confirmed appointments.
              </div>
            ) : (
              myAppointments.map(appt => (
                <div key={appt.id} className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-emerald-900">{format(appt.confirmedDate!, 'MMMM d, yyyy')}</h3>
                    <span className="bg-emerald-200 text-emerald-800 text-xs font-bold px-2 py-1 rounded flex items-center">
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full mr-1.5"></span>
                      CONFIRMED
                    </span>
                  </div>
                  <p className="text-sm text-emerald-700">{appt.reason}</p>
                  {appt.professorNote && (
                    <div className="mt-3 text-sm bg-white/60 p-3 rounded-lg border border-emerald-100 text-emerald-800">
                      <strong>Note from Professor:</strong> {appt.professorNote}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
