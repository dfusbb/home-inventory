"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ActorModal from "@/components/ActorModal";
import ReportsView from "@/components/ReportsView";

interface User {
  id: string;
  familyName: string;
  address: string;
  headName: string | null;
  createdAt: string;
}

interface AdminInfo {
  householdId: string;
  familyName: string;
  address: string;
}

function ChangeCodeForm({
  userId,
  userLabel,
  onSuccess,
  onCancel,
}: {
  userId: string;
  userLabel: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newCode.trim().length < 4) {
      setError("הקוד חייב להכיל לפחות 4 תווים");
      return;
    }

    if (newCode !== confirmCode) {
      setError("הקודים לא תואמים");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/code`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newCode: newCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בעדכון הקוד");
        return;
      }

      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2 animate-fade-in"
    >
      <p className="text-sm font-medium text-amber-900">
        שינוי קוד עבור: {userLabel}
      </p>
      {error && (
        <div className="p-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
      )}
      <input
        type="password"
        value={newCode}
        onChange={(e) => setNewCode(e.target.value)}
        placeholder="קוד חדש"
        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        required
      />
      <input
        type="password"
        value={confirmCode}
        onChange={(e) => setConfirmCode(e.target.value)}
        placeholder="אימות קוד חדש"
        className="w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        required
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60"
        >
          {saving ? "שומר..." : "עדכן קוד"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [showActorModal, setShowActorModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [headName, setHeadName] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingCodeFor, setEditingCodeFor] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      const me = await res.json();

      if (!me.authenticated || !me.isAdmin) {
        router.push("/");
        return;
      }

      setAdminInfo({
        householdId: me.householdId,
        familyName: me.familyName,
        address: "",
      });

      if (!me.actorName) {
        setShowActorModal(true);
      }

      await loadUsers();
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      setUsers(await res.json());
    }
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdding(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyName, address, code, headName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה");
        return;
      }

      setUsers((prev) => [data, ...prev]);
      setFamilyName("");
      setAddress("");
      setCode("");
      setHeadName("");
      setShowAddForm(false);
    } finally {
      setAdding(false);
    }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`למחוק את משפחת ${name}?`)) return;
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  }

  function handleCodeUpdated(label: string) {
    setEditingCodeFor(null);
    setCodeSuccess(`הקוד עודכן בהצלחה עבור ${label}`);
    setTimeout(() => setCodeSuccess(""), 4000);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">טוען...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {showActorModal && (
        <ActorModal mode="admin" onComplete={() => setShowActorModal(false)} />
      )}

      <header className="bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <h1 className="font-bold text-slate-800">ניהול משתמשים</h1>
              <p className="text-xs text-muted">פאנל מנהל מערכת</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-xl bg-slate-100 text-sm text-slate-600 hover:bg-slate-200"
          >
            יציאה
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {codeSuccess && (
          <div className="p-3 rounded-xl bg-green-50 text-green-700 text-sm border border-green-200 animate-fade-in mb-4">
            ✓ {codeSuccess}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
        {adminInfo && (
          <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <span>🔑</span> הקוד שלי (מנהל)
                </h2>
                <p className="text-sm text-muted mt-0.5">
                  משפחת {adminInfo.familyName}
                </p>
              </div>
              {editingCodeFor !== adminInfo.householdId && (
                <button
                  onClick={() => setEditingCodeFor(adminInfo.householdId)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-sm font-medium hover:bg-indigo-100"
                >
                  שנה קוד
                </button>
              )}
            </div>
            {editingCodeFor === adminInfo.householdId && (
              <ChangeCodeForm
                userId={adminInfo.householdId}
                userLabel="מנהל המערכת"
                onSuccess={() => handleCodeUpdated("מנהל המערכת")}
                onCancel={() => setEditingCodeFor(null)}
              />
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">משפחות רשומות ({users.length})</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-[var(--primary-hover)]"
            >
              + הוסף משתמש
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={addUser}
              className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-3 animate-fade-in"
            >
              {error && (
                <div className="p-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
              )}
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="שם משפחה"
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="כתובת"
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
              <input
                type="text"
                value={headName}
                onChange={(e) => setHeadName(e.target.value)}
                placeholder="שם ראש המשפחה"
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="קוד כניסה"
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
              <button
                type="submit"
                disabled={adding}
                className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold disabled:opacity-60"
              >
                {adding ? "מוסיף..." : "צור משתמש"}
              </button>
            </form>
          )}

          {users.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <p>אין משתמשים עדיין</p>
              <p className="text-xs mt-1">הוסיפו משפחה ראשונה</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-4 rounded-xl border border-border bg-white hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        משפחת {user.familyName}
                      </p>
                      <p className="text-sm text-muted">{user.address}</p>
                      <p className="text-sm text-indigo-600 mt-0.5">
                        ראש משפחה: {user.headName || "לא הוגדר"}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        נוצר: {new Date(user.createdAt).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {editingCodeFor !== user.id && (
                        <button
                          onClick={() => setEditingCodeFor(user.id)}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm hover:bg-amber-100"
                        >
                          שנה קוד
                        </button>
                      )}
                      <button
                        onClick={() => deleteUser(user.id, user.familyName)}
                        className="px-3 py-1.5 rounded-lg text-red-500 text-sm hover:bg-red-50"
                      >
                        מחק
                      </button>
                    </div>
                  </div>
                  {editingCodeFor === user.id && (
                    <ChangeCodeForm
                      userId={user.id}
                      userLabel={`משפחת ${user.familyName}`}
                      onSuccess={() =>
                        handleCodeUpdated(`משפחת ${user.familyName}`)
                      }
                      onCancel={() => setEditingCodeFor(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 mb-2">💡 הוראות</h3>
          <ul className="text-sm text-muted space-y-1.5">
            <li>• כניסת מנהל: admin / admin / 1234</li>
            <li>• כל משתמש = בית אחד עם מלאי נפרד</li>
            <li>• האדמין מגדיר ראש משפחה בעת יצירת משתמש</li>
            <li>• ראש המשפחה מוסיף בני משפחה – רק רשומים יכולים להיכנס</li>
            <li>• ניתן לשנות קוד כניסה לכל משתמש ולמנהל עצמו</li>
          </ul>
        </div>
          </div>

          <div className="h-[calc(100vh-120px)] min-h-[500px] sticky top-20">
            <ReportsView
              apiUrl="/api/admin/reports"
              showFamily
              embedded
            />
          </div>
        </div>
      </main>
    </div>
  );
}
