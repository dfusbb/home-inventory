"use client";

import { useState } from "react";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

interface CategoriesPanelProps {
  categories: string[];
  onClose: () => void;
  onCategoriesChange: (categories: string[]) => void;
}

export default function CategoriesPanel({
  categories,
  onClose,
  onCategoriesChange,
}: CategoriesPanelProps) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function addCategory() {
    if (!newName.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onCategoriesChange(data.categories);
        setNewName("");
      } else {
        setError(data.error || "שגיאה בהוספת קטגוריה");
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-slide-up">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold">ניהול קטגוריות</h2>
            <p className="text-xs text-muted mt-0.5">הוסיפו קטגוריות מותאמות למשפחה</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">קטגוריות ברירת מחדל</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CATEGORIES.map((cat) => (
                <span
                  key={cat}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-600"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {categories.length > DEFAULT_CATEGORIES.length && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">קטגוריות מותאמות</p>
              <div className="flex flex-wrap gap-2">
                {categories
                  .filter((cat) => !(DEFAULT_CATEGORIES as readonly string[]).includes(cat))
                  .map((cat) => (
                    <span
                      key={cat}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-xs text-primary font-medium"
                    >
                      {cat}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border shrink-0 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError("");
              }}
              placeholder="שם קטגוריה חדשה"
              className="flex-1 px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              autoFocus
            />
            <button
              onClick={addCategory}
              disabled={adding}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60"
            >
              {adding ? "..." : "הוסף"}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
