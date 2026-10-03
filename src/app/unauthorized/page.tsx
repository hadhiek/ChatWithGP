import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-red-50 p-6 rounded-full mb-6">
        <AlertTriangle className="h-12 w-12 text-red-600" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
      <p className="text-gray-600 max-w-md mb-8">
        This portal is restricted to official NITC community members. Please sign in using your official <strong>@nitc.ac.in</strong> Google account.
      </p>
      <Link 
        href="/"
        className="bg-gray-900 text-white px-6 py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
}
