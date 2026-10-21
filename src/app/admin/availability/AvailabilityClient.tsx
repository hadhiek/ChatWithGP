"use client";

import { useState, useEffect } from "react";
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
  Trash2,
  Plus,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle,
} from "lucide-react";

interface Availability {
  id: string;
  date: string;
  timeSlot?: string | null;
  status: string;
}

const DEFAULT_TIME_SLOTS = [
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
];

export default function ProfessorAvailabilityPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([
    "10:00 AM - 11:00 AM",
  ]);
  const [customSlot, setCustomSlot] = useState("");
  const [existingAvailability, setExistingAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/availability");
      const data = await res.json();
      setExistingAvailability(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to fetch availability slots.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const getDaySlots = (day: Date) =>
    existingAvailability.filter((a) => isSameDay(new Date(a.date), day));

  const isSelected = (day: Date) =>
    selectedDates.some((d) => isSameDay(d, day));

  const toggleDay = (day: Date) => {
    const isPast = isBefore(day, new Date()) && !isToday(day);
    if (isPast) return;

    setSelectedDates((prev) =>
      isSelected(day)
        ? prev.filter((d) => !isSameDay(d, day))
        : [...prev, day]
    );
  };

  const toggleTimeSlot = (slot: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(slot)
        ? prev.filter((s) => s !== slot)
        : [...prev, slot]
    );
  };

  const addCustomSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSlot.trim();
    if (!trimmed) return;
    if (!selectedTimeSlots.includes(trimmed)) {
      setSelectedTimeSlots((prev) => [...prev, trimmed]);
    }
    setCustomSlot("");
  };

  const handlePublish = async () => {
    if (selectedDates.length === 0) {
      showToast("Please select at least one date on the calendar.", "error");
      return;
    }
    if (selectedTimeSlots.length === 0) {
      showToast("Please select at least one time slot.", "error");
      return;
    }

    setPublishing(true);
    try {
      // Build slots payload for each selected date x each selected time slot
      const slotsPayload: { date: string; timeSlot: string }[] = [];
      for (const d of selectedDates) {
        for (const t of selectedTimeSlots) {
          // Avoid creating duplicate of existing availability
          const alreadyExists = existingAvailability.some(
            (ea) => isSameDay(new Date(ea.date), d) && ea.timeSlot === t
          );
          if (!alreadyExists) {
            slotsPayload.push({
              date: d.toISOString(),
              timeSlot: t,
            });
          }
        }
      }

      if (slotsPayload.length === 0) {
        showToast("Selected slots already exist.", "error");
        setPublishing(false);
        return;
      }

      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: slotsPayload }),
      });

      if (res.ok) {
        setSelectedDates([]);
        fetchAvailability();
        showToast(`${slotsPayload.length} time slot(s) published successfully!`, "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to publish slots.", "error");
      }
    } catch {
      showToast("Something went wrong.", "error");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/availability/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAvailability();
        showToast("Time slot removed.", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to remove time slot.", "error");
      }
    } catch {
      showToast("Something went wrong.", "error");
    }
  };

  const upcomingAvailability = existingAvailability
    .filter(
      (a) => !isBefore(new Date(a.date), new Date()) || isToday(new Date(a.date))
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
          Manage Availability & Time Slots
        </h1>
        <p className="text-gray-700 text-sm mt-1.5 font-medium">
          Select dates on the calendar, pick or add your available time slots, and publish them for students to book.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Calendar & Time Slots Picker */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar Card */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-900 transition-colors"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-900 transition-colors"
                  aria-label="Next Month"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Day Headers */}
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

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map((day) => {
                const isPast = isBefore(day, new Date()) && !isToday(day);
                const daySlots = getDaySlots(day);
                const hasExisting = daySlots.length > 0;
                const selected = isSelected(day);
                const today = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => toggleDay(day)}
                    disabled={isPast}
                    className={`
                      relative min-h-[52px] rounded-xl flex flex-col items-center justify-center p-1 text-sm font-bold transition-all border
                      ${
                        isPast
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "cursor-pointer"
                      }
                      ${
                        selected
                          ? "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-500 ring-offset-1"
                          : ""
                      }
                      ${
                        !selected && hasExisting
                          ? "bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100"
                          : ""
                      }
                      ${
                        !selected && !hasExisting && !isPast
                          ? "bg-white text-gray-900 border-gray-200 hover:bg-gray-100"
                          : ""
                      }
                      ${today && !selected ? "ring-2 ring-amber-500" : ""}
                    `}
                  >
                    <span>{format(day, "d")}</span>
                    {hasExisting && !selected && (
                      <span className="text-[10px] font-extrabold text-emerald-800 mt-0.5">
                        {daySlots.length} slot{daySlots.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {selected && (
                      <span className="text-[10px] font-bold text-blue-100 mt-0.5">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-5 text-xs font-semibold text-gray-800">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block border border-blue-700" />
                Date Selected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-50 border-2 border-emerald-400 inline-block" />
                Published Slots Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded ring-2 ring-amber-500 inline-block" />
                Today
              </span>
            </div>
          </div>

          {/* Time Slots Selector Card */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 text-gray-900">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Select Time Slots to Offer
                </h2>
                <p className="text-xs text-gray-700 mt-1 font-medium">
                  Pick the time slots you wish to make available for the selected dates.
                </p>
              </div>
              <span className="text-xs font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-full">
                {selectedTimeSlots.length} slot{selectedTimeSlots.length !== 1 ? "s" : ""} active
              </span>
            </div>

            {/* Default Time Slots Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
              {DEFAULT_TIME_SLOTS.map((slot) => {
                const active = selectedTimeSlots.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleTimeSlot(slot)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-between ${
                      active
                        ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                        : "bg-white text-gray-900 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    <span>{slot}</span>
                    {active ? (
                      <CheckCircle className="h-3.5 w-3.5 text-white flex-shrink-0" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Slot Input */}
            <form onSubmit={addCustomSlot} className="flex gap-2">
              <input
                type="text"
                value={customSlot}
                onChange={(e) => setCustomSlot(e.target.value)}
                placeholder="Or add custom slot (e.g. 11:30 AM - 12:30 PM)"
                className="flex-1 bg-white border-2 border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <button
                type="submit"
                className="bg-gray-900 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-black transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </form>

            {/* Publish Banner */}
            <div className="mt-6 pt-5 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div>
                <p className="text-sm font-bold text-blue-950">
                  {selectedDates.length} date{selectedDates.length !== 1 ? "s" : ""} selected &times; {selectedTimeSlots.length} time slot{selectedTimeSlots.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-blue-800 font-medium mt-0.5">
                  Total {selectedDates.length * selectedTimeSlots.length} slot instance(s) will be published.
                </p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDates([])}
                  disabled={selectedDates.length === 0}
                  className="px-4 py-2 text-sm font-bold text-gray-800 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  Clear Dates
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing || selectedDates.length === 0 || selectedTimeSlots.length === 0}
                  className="flex-1 sm:flex-initial px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Plus className="h-4 w-4 text-white" />
                  )}
                  {publishing ? "Publishing..." : "Publish Available Slots"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Published Slots List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Published Availability
            </h2>
            <span className="text-xs font-bold text-gray-700 bg-gray-200 px-2 py-0.5 rounded-full">
              {upcomingAvailability.length} total
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-600">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : upcomingAvailability.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center text-gray-600 font-medium text-sm">
              No upcoming time slots published yet. Select dates on the calendar and click Publish.
            </div>
          ) : (
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {upcomingAvailability.map((a) => (
                <div
                  key={a.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-3.5 flex items-center justify-between hover:border-gray-300 shadow-sm transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                      {format(new Date(a.date), "EEE, MMM d, yyyy")}
                    </p>
                    <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mt-1">
                      <Clock className="h-3 w-3 text-gray-500 flex-shrink-0" />
                      {a.timeSlot || "General Slot"}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md mt-1.5 border ${
                        a.status === "AVAILABLE"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : a.status === "BOOKED"
                          ? "bg-blue-100 text-blue-900 border-blue-300"
                          : "bg-gray-100 text-gray-800 border-gray-300"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>

                  {a.status === "AVAILABLE" ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      className="p-2 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                      title="Remove this slot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                      Booked
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
