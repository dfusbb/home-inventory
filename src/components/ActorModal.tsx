"use client";

import { useEffect, useState } from "react";

interface FamilyMember {
  id: string;
  name: string;
  isHead: boolean;
}

interface ActorModalProps {
  mode?: "admin" | "household";
  onComplete: (name: string, isHead?: boolean) => void;
}

export default function ActorModal({
  mode = "household",
  onComplete,
}: ActorModalProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(mode === "household");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "household") return;

    fetch("/api/family-members")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMembers(data);
      })
      .finally(() => setLoadingMembers(false));
  }, [mode]);

  async function selectMember(member: FamilyMember) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/actor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "אין גישה");
        return;
      }

      onComplete(member.name, member.isHead);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("יש להזין שם");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/actor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה");
        return;
      }

      onComplete(name.trim());
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
          <h2 className="text-xl font-bold text-slate-800">
            {mode === "admin" ? "הקלד את שמך" : "מי נכנס?"}
          </h2>
          <p className="text-sm text-muted mt-1">
            {mode === "admin"
              ? "כדי שנדע מי ביצע את העדכונים"
              : "רק בני משפחה רשומים יכולים להיכנס"}
          </p>
        </div>

        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {mode === "admin" ? (
          <form onSubmit={handleAdminSubmit}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-center text-lg"
              placeholder="השם שלך"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-60 transition"
            >
              {loading ? "שומר..." : "המשך"}
            </button>
          </form>
        ) : loadingMembers ? (
          <p className="text-center text-muted py-4">טוען רשימה...</p>
        ) : members.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted">אין בני משפחה רשומים</p>
            <p className="text-xs text-muted mt-1">פנו לראש המשפחה או למנהל</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => selectMember(member)}
                disabled={loading}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary hover:bg-blue-50 transition disabled:opacity-60"
              >
                <span className="font-medium text-slate-800">{member.name}</span>
                {member.isHead && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    ראש משפחה
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
