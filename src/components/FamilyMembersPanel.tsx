"use client";

import { useEffect, useState } from "react";

interface FamilyMember {
  id: string;
  name: string;
  isHead: boolean;
}

interface FamilyMembersPanelProps {
  onClose: () => void;
}

export default function FamilyMembersPanel({ onClose }: FamilyMembersPanelProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    try {
      const res = await fetch("/api/family-members");
      if (res.ok) setMembers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    setAdding(true);
    try {
      const res = await fetch("/api/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה");
        return;
      }
      setMembers((prev) => [...prev, data].sort((a, b) => {
        if (a.isHead !== b.isHead) return a.isHead ? -1 : 1;
        return a.name.localeCompare(b.name, "he");
      }));
      setNewName("");
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(id: string, name: string) {
    if (!confirm(`להסיר את ${name} מרשימת בני המשפחה?`)) return;
    const res = await fetch(`/api/family-members/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold">👨‍👩‍👧‍👦 בני המשפחה</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-sm text-muted mb-4">
            רק בני משפחה רשומים יכולים להיכנס לממשק
          </p>

          {error && (
            <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={addMember} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם בן/בת משפחה חדש/ה"
              className="flex-1 px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60"
            >
              {adding ? "..." : "הוסף"}
            </button>
          </form>

          {loading ? (
            <p className="text-center text-muted py-6">טוען...</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.name}</span>
                    {member.isHead && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        ראש משפחה
                      </span>
                    )}
                  </div>
                  {!member.isHead && (
                    <button
                      onClick={() => removeMember(member.id, member.name)}
                      className="text-red-500 text-sm hover:bg-red-50 px-2 py-1 rounded-lg"
                    >
                      הסר
                    </button>
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
