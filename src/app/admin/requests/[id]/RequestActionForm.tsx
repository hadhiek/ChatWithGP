"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Availability {
  id: string;
  date: string;
  timeSlot?: string | null;
  status: string;
}

interface Preference {
  id: string;
  priority: number;
  availabilityId: string;
  availability: Availability;
}

interface User {
  name?: string | null;
  email?: string | null;
  department?: string | null;
}

interface Request {
  id: string;
  status: string;
  reason?: string | null;
  professorNote?: string | null;
  confirmedDate?: string | null;
  confirmedTimeSlot?: string | null;
  user: User;
  preferences: Preference[];
}

export default function RequestActionForm({ request }: { request: Request }) {
  const router = useRouter();

  // Find first available preference if possible
  const firstAvailablePref = request.preferences.find(
    (p) => p.availability?.status === "AVAILABLE"
  );

  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState(
    firstAvailablePref?.availabilityId ||
      firstAvailablePref?.availability?.id ||
      request.preferences[0]?.availabilityId ||
      request.preferences[0]?.availability?.id ||
      ""
  );

  const [note, setNote] = useState(request.professorNote || "");
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const doAction = async (action: "ACCEPT" | "REJECT") => {
    if (action === "ACCEPT" && !selectedAvailabilityId) {
      showToast("Please select a date and time slot to confirm.", "error");
      return;
    }

    setLoading(action === "ACCEPT" ? "accept" : "reject");
    try {
      const res = await fetch(`/api/requests/${request.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          availabilityId: action === "ACCEPT" ? selectedAvailabilityId : undefined,
          professorNote: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Action failed.", "error");
      } else {
        showToast(
          action === "ACCEPT" ? "Appointment confirmed successfully!" : "Request rejected.",
          "success"
        );
        setTimeout(() => router.push("/admin/requests"), 1200);
        router.refresh();
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setLoading(null);
    }
  };

  const isPending = request.status === "PENDING";
  const availablePrefs = request.preferences.filter(
    (p) => p.availability?.status === "AVAILABLE"
  );

  return (
    <div>
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all ${
            toast.type === "success" ? "bg-emerald-700 border border-emerald-500" : "bg-red-700 border border-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      {isPending ? (
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm space-y-5 text-gray-900">
          <h2 className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-3">
            Review & Decision
          </h2>

          {/* Select date and time slot */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Select Preferred Slot to Confirm
            </label>
            <select
              value={selectedAvailabilityId}
              onChange={(e) => setSelectedAvailabilityId(e.target.value)}
              className="w-full border-2 border-gray-300 bg-white text-gray-900 font-medium rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              {request.preferences.map((pref) => {
                const avail = pref.availability;
                const isAvail = avail?.status === "AVAILABLE";
                return (
                  <option
                    key={pref.id}
                    value={avail?.id}
                    disabled={!isAvail}
                    className="bg-white text-gray-900"
                  >
                    #{pref.priority} — {avail?.date ? format(new Date(avail.date), "EEEE, MMMM d, yyyy") : "Date"}
                    {avail?.timeSlot ? ` [${avail.timeSlot}]` : " [General Slot]"}
                    {!isAvail ? " (Already Booked)" : ""}
                  </option>
                );
              })}
            </select>
            {availablePrefs.length === 0 ? (
              <p className="text-xs font-semibold text-red-600 mt-2">
                All selected slots are currently unavailable or already booked.
              </p>
            ) : (
              <p className="text-xs text-gray-600 mt-1.5">
                The student will be notified of this confirmed slot.
              </p>
            )}
          </div>

          {/* Note to student */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Note for Student <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g., Please report to Room 302 with your synopsis/documents."
              className="w-full border-2 border-gray-300 bg-white text-gray-900 font-medium rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none placeholder:text-gray-400"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <button
              type="button"
              onClick={() => doAction("ACCEPT")}
              disabled={loading !== null || availablePrefs.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading === "accept" ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <CheckCircle className="h-5 w-5 text-white" />
              )}
              Confirm Appointment
            </button>
            <button
              type="button"
              onClick={() => doAction("REJECT")}
              disabled={loading !== null}
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-700 border-2 border-red-300 font-bold px-5 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "reject" ? (
                <Loader2 className="h-5 w-5 animate-spin text-red-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Reject Request
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`p-6 rounded-2xl border-2 text-base font-bold text-center ${
            request.status === "ACCEPTED"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-red-50 border-red-300 text-red-900"
          }`}
        >
          This request has been marked as <strong>{request.status}</strong>.
        </div>
      )}
    </div>
  );
}
