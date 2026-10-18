import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, AlertCircle } from "lucide-react";
import StudentBookingForm from "./StudentBookingForm";

export default async function AvailabilityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  // Check for an existing PENDING request — block further bookings until resolved
  const pendingRequest = await prisma.appointmentRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
    include: {
      preferences: {
        include: { availability: true },
        orderBy: { priority: "asc" },
      },
    },
  });

  if (pendingRequest) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-gray-900">
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="bg-amber-100 p-4 rounded-full">
              <AlertCircle className="h-10 w-10 text-amber-700" />
            </div>
          </div>
          <h1 className="text-xl font-black text-amber-950">
            You Already Have a Pending Request
          </h1>
          <p className="text-sm font-medium text-amber-900 max-w-md mx-auto leading-relaxed">
            You can only have <strong>one active appointment request</strong> at a time.
            Your current request is waiting for the professor to respond.
            Once it is accepted or rejected you can submit a new one.
          </p>

          {/* Current pending request summary */}
          <div className="mt-4 text-left bg-white border border-amber-300 rounded-xl p-5 space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-amber-800">
              Your Current Pending Request
            </p>
            {pendingRequest.reason && (
              <p className="text-sm font-bold text-gray-900">
                Topic: {pendingRequest.reason}
              </p>
            )}
            <div className="space-y-2">
              {pendingRequest.preferences.map((pref) => (
                <div
                  key={pref.id}
                  className="flex flex-wrap items-center gap-2 text-sm bg-amber-50 px-3 py-2 rounded-lg border border-amber-200"
                >
                  <span className="text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                    Preference #{pref.priority}
                  </span>
                  <span className="font-bold text-gray-900">
                    {new Date(pref.availability.date).toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  {pref.availability.timeSlot && (
                    <span className="flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold px-2 py-0.5 rounded-md">
                      <Clock className="h-3 w-3" />
                      {pref.availability.timeSlot}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <Link
              href="/requests"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
            >
              View My Requests
            </Link>
            <Link
              href="/"
              className="bg-white border-2 border-gray-300 text-gray-900 font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No pending request — show the booking form
  return <StudentBookingForm />;
}
