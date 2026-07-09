"use client";

import { useState } from "react";
import { generateShoppingPDF } from "@/lib/pdf";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  isChecked: boolean;
}

interface TripColumnProps {
  items: ShoppingItem[];
  familyName: string;
  actorName: string;
}

export default function TripColumn({ items, familyName, actorName }: TripColumnProps) {
  const [shopperName, setShopperName] = useState(actorName);
  const [downloading, setDownloading] = useState(false);

  const activeItems = items.filter((i) => !i.isChecked);

  async function downloadPDF() {
    if (activeItems.length === 0) {
      alert("אין פריטים ברשימת הקניות");
      return;
    }

    setDownloading(true);
    try {
      await generateShoppingPDF({
        familyName,
        shopperName: shopperName || "לא צוין",
        items: activeItems,
        date: new Date(),
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-gradient-to-l from-green-50 to-white">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span>🚗</span> יוצאים לקניות
        </h2>
        <p className="text-xs text-muted mt-0.5">הורידו רשימה להדפסה</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-5">
          <label className="text-sm font-medium text-slate-600">מי הולך לקנות?</label>
          <input
            type="text"
            value={shopperName}
            onChange={(e) => setShopperName(e.target.value)}
            className="w-full mt-1.5 px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="השם שלך"
          />
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            רשימת קניות ({activeItems.length} פריטים)
          </h3>
          {activeItems.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">אין פריטים לקנייה</p>
          ) : (
            <ul className="space-y-2">
              {activeItems.map((item, i) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded border border-slate-300 shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  <span className="text-muted font-medium">×{item.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={downloadPDF}
          disabled={downloading || activeItems.length === 0}
          className="w-full py-3.5 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md shadow-green-200/50"
        >
          {downloading ? (
            "מכין PDF..."
          ) : (
            <>
              <span>📄</span> הורד PDF לקנייה
            </>
          )}
        </button>

        <p className="text-xs text-muted text-center mt-3">
          העבירו את הקובץ למחשב והדפיסו
        </p>
      </div>
    </div>
  );
}
