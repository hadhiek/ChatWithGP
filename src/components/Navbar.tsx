"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900 tracking-tight">
              ChatWith<span className="text-blue-600">GP</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <Link href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </Link>
                {session.user?.role === "PROFESSOR" ? (
                  <>
                    <Link href="/admin/availability" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                      Availability
                    </Link>
                    <Link href="/admin/requests" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                      Requests
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/availability" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                      Book Appointment
                    </Link>
                    <Link href="/requests" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                      My Requests
                    </Link>
                  </>
                )}
                <div className="ml-4 flex items-center md:ml-6">
                  <span className="text-sm text-gray-500 mr-4 flex items-center">
                    <UserIcon className="h-4 w-4 mr-1" />
                    {session.user?.name}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center text-gray-500 hover:text-gray-700 p-2 rounded-full transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
