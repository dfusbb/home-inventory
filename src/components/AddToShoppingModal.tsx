"use client";

import { useState } from "react";
import type { Product } from "@/components/InventoryColumn";

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  return `₪${price.toFixed(2)}`;
}

interface AddToShoppingModalProps {
  product: Product;
  stores: string[];
  warnings: string[];
  existingListQty?: number;
  onClose: () => void;
  onAdded: (item: unknown, updatedProduct?: Product) => void;
}

export default function AddToShoppingModal({
  product,
  stores,
  warnings,
  existingListQty,
  onClose,
  onAdded,
}: AddToShoppingModalProps) {
  const [stockQty, setStockQty] = useState(product.quantity);
  const [buyQty, setBuyQty] = useState(1);
  const [store, setStore] = useState(product.store || stores[0] || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity: buyQty,
          store: store || null,
          updateStockQuantity: stockQty,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בהוספה");
        return;
      }
      onAdded(data, { ...product, quantity: stockQty, store: store || null });
      onClose();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
        <h2 className="text-lg font-bold text-center mb-1">{product.name}</h2>
        {product.unitPrice != null && (
          <p className="text-sm text-muted text-center mb-3">
            {formatPrice(product.unitPrice)} ליחידה
          </p>
        )}

        {warnings.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
            {warnings.map((w) => (
              <p key={w} className="text-sm text-amber-800">
                ⚠️ {w}
              </p>
            ))}
          </div>
        )}

        {existingListQty !== undefined && existingListQty > 0 && (
          <p className="text-xs text-muted text-center mb-3">
            כבר ברשימה: {existingListQty} יחידות (יתווסף לכמות)
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600">כמות במלאי</label>
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => setStockQty(Math.max(0, stockQty - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 font-bold text-lg"
              >
                −
              </button>
              <span className="flex-1 text-center font-bold text-xl">{stockQty}</span>
              <button
                onClick={() => setStockQty(stockQty + 1)}
                className="w-10 h-10 rounded-xl bg-slate-100 font-bold text-lg"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">כמה לקנות</label>
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => setBuyQty(Math.max(1, buyQty - 1))}
                className="w-10 h-10 rounded-xl bg-orange-100 font-bold text-lg"
              >
                −
              </button>
              <span className="flex-1 text-center font-bold text-xl">{buyQty}</span>
              <button
                onClick={() => setBuyQty(buyQty + 1)}
                className="w-10 h-10 rounded-xl bg-orange-100 font-bold text-lg"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">חנות</label>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-white text-sm"
            >
              <option value="">ללא חנות</option>
              {stores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium"
          >
            ביטול
          </button>
          <button
            onClick={handleAdd}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-60"
          >
            {loading ? "..." : "הוסף לרשימה"}
          </button>
        </div>
      </div>
    </div>
  );
}
