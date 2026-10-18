"use client";

import { useState } from "react";
import { Loader2, Pencil, Check, X } from "lucide-react";

interface NoteEditorProps {
  appointmentId: string;
  initialNote: string | null;
}

export default function AppointmentNoteEditor({
  appointmentId,
  initialNote,
}: NoteEditorProps) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(initialNote || "");
  const [savedNote, setSavedNote] = useState(initialNote || "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorNote: note }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save note.", false);
      } else {
        setSavedNote(note.trim());
        setEditing(false);
        showToast("Note saved.", true);
      }
    } catch {
      showToast("Network error. Please try again.", false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setNote(savedNote);
    setEditing(false);
  };

  return (
    <div className="mt-3">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-xl ${
            toast.ok ? "bg-emerald-700" : "bg-red-700"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add a note for this appointment (e.g. topics discussed, follow-up actions)..."
            className="w-full border-2 border-gray-300 bg-white text-gray-900 font-medium rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 placeholder:text-gray-400"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 shadow-sm"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save Note
            </button>
            <button
              type="button"
              onClick={cancel}
              className="flex items-center gap-1.5 bg-white border-2 border-gray-300 text-gray-800 text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="group flex items-start gap-2">
          {savedNote ? (
            <div className="flex-1 bg-amber-50 border border-amber-300 text-amber-950 text-xs font-medium p-3 rounded-xl">
              <span className="font-bold block mb-0.5 text-amber-900">
                Professor&apos;s Note:
              </span>
              {savedNote}
            </div>
          ) : (
            <div className="flex-1 text-xs text-gray-500 italic">
              No note added yet.
            </div>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-shrink-0 p-2 rounded-xl text-gray-500 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
            title={savedNote ? "Edit note" : "Add note"}
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
