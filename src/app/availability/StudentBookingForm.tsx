"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isBefore,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  X,
  Send,
  Clock,
} from "lucide-react";

interface Availability {
  id: string;
  date: string;
  timeSlot?: string | null;
  status: string;
}

interface SelectedPref {
  availability: Availability;
  priority: number;
}

const MAX_PREFERENCES = 3;

export default function StudentBookingForm() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [preferences, setPreferences] = useState<SelectedPref[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch("/api/availability")
      .then((res) => res.json())
      .then((data) => {
        const slots: Availability[] = Array.isArray(data) ? data : [];
        setAvailabilities(slots);
        const firstAvail = slots.find((s) => s.status === "AVAILABLE");
        if (firstAvail) setSelectedDay(new Date(firstAvail.date));
        else setSelectedDay(new Date());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const getAvailableSlotsForDay = (day: Date) =>
    availabilities.filter(
      (a) => isSameDay(new Date(a.date), day) && a.status === "AVAILABLE"
    );

  const isSlotSelected = (slotId: string) =>
    preferences.some((p) => p.availability.id === slotId);

  const getSlotPreferenceIndex = (slotId: string) =>
    preferences.findIndex((p) => p.availability.id === slotId);

  const toggleSlotSelection = (slot: Availability) => {
    if (isSlotSelected(slot.id)) {
      setPreferences((prev) =>
        prev
          .filter((p) => p.availability.id !== slot.id)
          .map((p, i) => ({ ...p, priority: i + 1 }))
      );
    } else {
      if (preferences.length >= MAX_PREFERENCES) {
        showToast(`You can select at most ${MAX_PREFERENCES} preferences.`, "error");
        return;
      }
      setPreferences((prev) => [
        ...prev,
        { availability: slot, priority: prev.length + 1 },
      ]);
    }
  };

  const movePref = (index: number, direction: "up" | "down") => {
    const newPrefs = [...preferences];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newPrefs.length) return;
    [newPrefs[index], newPrefs[swapIndex]] = [newPrefs[swapIndex], newPrefs[index]];
    setPreferences(newPrefs.map((p, i) => ({ ...p, priority: i + 1 })));
  };

  const removePref = (index: number) => {
    setPreferences((prev) =>
      prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, priority: i + 1 }))
    );
  };

  const handleSubmit = async () => {
    if (preferences.length === 0) {
      showToast("Please select at least one preferred time slot.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim() || undefined,
          preferences: preferences.map((p) => ({
            availabilityId: p.availability.id,
            priority: p.priority,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to submit request.", "error");
      } else {
        showToast("Your appointment request was submitted successfully!", "success");
        setTimeout(() => router.push("/requests"), 1200);
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const ordinalLabels = ["1st Preference", "2nd Preference", "3rd Preference"];
  const selectedDaySlots = selectedDay ? getAvailableSlotsForDay(selectedDay) : [];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all ${
            toast.type === "success"
              ? "bg-emerald-700 border border-emerald-500"
              : "bg-red-700 border border-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Book an Appointment
        </h1>
        <p className="text-gray-700 text-sm mt-1.5 font-medium">
          Select a date on the calendar, choose your preferred time slots (up to{" "}
          {MAX_PREFERENCES}), and rank them in order of priority.
          You may only have <strong>one pending request at a time</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar + Time Slot Picker */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 text-gray-900">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-900 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-900 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-bold text-gray-700 uppercase py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64 text-gray-600">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: startPad }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {days.map((day) => {
                  const isPast = isBefore(day, new Date()) && !isToday(day);
                  const availableSlots = getAvailableSlotsForDay(day);
                  const hasSlots = availableSlots.length > 0;
                  const isCurDaySelected = selectedDay && isSameDay(selectedDay, day);
                  const hasSelectedSlotHere = availableSlots.some((s) =>
                    isSlotSelected(s.id)
                  );

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      disabled={isPast}
                      className={`
                        relative min-h-[54px] rounded-xl flex flex-col items-center justify-center p-1 text-sm font-bold transition-all border-2
                        ${isPast ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "cursor-pointer"}
                        ${isCurDaySelected ? "ring-2 ring-blue-600 ring-offset-2 border-blue-600" : ""}
                        ${hasSelectedSlotHere ? "bg-blue-600 text-white border-blue-700 shadow-sm" : ""}
                        ${hasSlots && !hasSelectedSlotHere ? "bg-emerald-50 text-emerald-950 border-emerald-400 hover:bg-emerald-100" : ""}
                        ${!hasSlots && !isPast && !hasSelectedSlotHere ? "bg-white text-gray-500 border-gray-200 hover:bg-gray-50" : ""}
                      `}
                    >
                      <span>{format(day, "d")}</span>
                      {hasSlots && (
                        <span
                          className={`text-[10px] font-extrabold mt-0.5 ${
                            hasSelectedSlotHere ? "text-blue-100" : "text-emerald-800"
                          }`}
                        >
                          {availableSlots.length} slot{availableSlots.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-6 text-xs font-semibold text-gray-800">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-50 border-2 border-emerald-400 inline-block" />
                Available Day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block border border-blue-700" />
                Contains Your Selection
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded ring-2 ring-blue-600 inline-block" />
                Currently Viewing
              </span>
            </div>
          </div>

          {/* Time Slot Picker */}
          {selectedDay && (
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 text-gray-900">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Time Slots — {format(selectedDay, "EEEE, MMMM d, yyyy")}
                </h3>
                <span className="text-xs font-bold text-gray-800 bg-gray-100 border border-gray-300 px-2.5 py-1 rounded-full">
                  {selectedDaySlots.length} available
                </span>
              </div>

              {selectedDaySlots.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-600 text-sm font-medium">
                  No time slots available for this date. Select a highlighted green date on the calendar.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedDaySlots.map((slot) => {
                    const selected = isSlotSelected(slot.id);
                    const prefIdx = getSlotPreferenceIndex(slot.id);

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => toggleSlotSelection(slot)}
                        className={`p-4 rounded-xl border-2 text-left font-bold transition-all flex flex-col justify-between ${
                          selected
                            ? "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-500"
                            : "bg-white text-gray-900 border-gray-300 hover:border-blue-500 hover:bg-blue-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-extrabold flex items-center gap-1.5">
                            <Clock
                              className={`h-4 w-4 ${selected ? "text-white" : "text-blue-600"}`}
                            />
                            {slot.timeSlot || "General Slot"}
                          </span>
                          {selected && (
                            <span className="text-[11px] font-black bg-white text-blue-700 px-2 py-0.5 rounded-full">
                              #{prefIdx + 1}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs mt-2 ${
                            selected ? "text-blue-100" : "text-emerald-700"
                          }`}
                        >
                          {selected ? "Selected preference" : "Click to select"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preferences list */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm text-gray-900">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Your Preferences ({preferences.length}/{MAX_PREFERENCES})
            </h2>
            <p className="text-xs text-gray-600 font-medium mb-4">
              Rank in order of your availability.
            </p>

            {preferences.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center text-sm font-medium text-gray-600">
                Click on the available time slots to add preferences.
              </div>
            ) : (
              <ul className="space-y-3">
                {preferences.map((pref, i) => (
                  <li
                    key={pref.availability.id}
                    className="bg-gray-50 border-2 border-gray-200 rounded-xl p-3.5 flex items-center gap-3"
                  >
                    <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-black text-blue-700 uppercase tracking-wide">
                        {ordinalLabels[i] || `Preference #${i + 1}`}
                      </span>
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {format(new Date(pref.availability.date), "EEE, MMM d, yyyy")}
                      </p>
                      <p className="text-xs font-semibold text-gray-700 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-gray-500" />
                        {pref.availability.timeSlot || "General Slot"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => movePref(i, "up")}
                        disabled={i === 0}
                        className="p-1 rounded-lg hover:bg-gray-200 text-gray-700 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePref(i, "down")}
                        disabled={i === preferences.length - 1}
                        className="p-1 rounded-lg hover:bg-gray-200 text-gray-700 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePref(i)}
                        className="p-1 rounded-lg hover:bg-red-100 text-gray-600 hover:text-red-700"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reason */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm text-gray-900">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Reason for Meeting{" "}
              <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g., Final year project discussion, internship guidance, etc."
              className="w-full border-2 border-gray-300 bg-white text-gray-900 font-medium rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none placeholder:text-gray-400"
            />
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || preferences.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Send className="h-5 w-5 text-white" />
            )}
            {submitting ? "Submitting..." : "Submit Appointment Request"}
          </button>

          <p className="text-xs text-center text-gray-500 font-medium">
            You can only have one pending request at a time. Once the professor responds, you can submit another.
          </p>
        </div>
      </div>
    </div>
  );
}
