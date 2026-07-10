"use client";

import { useState } from "react";

interface ActorModalProps {
  mode?: "admin" | "household";
  onComplete: (name: string, isHead?: boolean) => void;
}

export default function ActorModal({
  mode = "household",
  onComplete,
}: ActorModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("יש להזין שם");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/actor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "אין גישה");
        return;
      }

      onComplete(data.actorName, data.isHead);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">👋</div>
          <h2 className="text-xl font-bold text-slate-800">הקלד את שמך</h2>
          <p className="text-sm text-muted mt-1">
            {mode === "admin"
              ? "כדי שנדע מי ביצע את העדכונים"
              : "רק שמות שראש המשפחה רשם יכולים להיכנס"}
          </p>
        </div>

        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-center text-lg"
            placeholder="השם שלך"
            autoFocus
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-60 transition"
          >
            {loading ? "בודק..." : "המשך"}
          </button>
        </form>
      </div>
    </div>
  );
}
