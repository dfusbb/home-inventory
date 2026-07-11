"use client";

import { useState } from "react";
import type { Product } from "@/components/InventoryColumn";
import QuantityStepper from "@/components/QuantityStepper";
import {
  formatQuantity,
  priceUnitLabel,
  type QuantityUnit,
} from "@/lib/units";
import { shoppingItemPrice } from "@/lib/shopping-price";

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  return `₪${price.toFixed(2)}`;
}

interface AddToShoppingModalProps {
  product: Product;
  stores: string[];
  warnings: string[];
  getExistingListQty?: (unit: QuantityUnit) => number | undefined;
  onClose: () => void;
  onAdded: (items: unknown | unknown[], updatedProduct?: Product) => void;
}

export default function AddToShoppingModal({
  product,
  stores,
  warnings,
  getExistingListQty,
  onClose,
  onAdded,
}: AddToShoppingModalProps) {
  const isWeightProduct = product.quantityUnit === "kg";
  const [stockKg, setStockKg] = useState(product.quantity);
  const [stockUnits, setStockUnits] = useState(product.unitCount ?? 0);
  const [buyKgQty, setBuyKgQty] = useState(isWeightProduct ? 1 : 0);
  const [buyUnitQty, setBuyUnitQty] = useState(isWeightProduct ? 0 : 1);
  const [store, setStore] = useState(product.store || stores[0] || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modeHint, setModeHint] = useState("");

  const kgPrice = shoppingItemPrice({ quantityUnit: "kg" }, product);
  const unitPrice = shoppingItemPrice({ quantityUnit: "unit" }, product);

  const existingKg = getExistingListQty?.("kg");
  const existingUnits = getExistingListQty?.("unit");

  function handleBuyKgChange(value: number) {
    if (value > 0 && buyUnitQty > 0) {
      setModeHint(
        `מוגדר לקנות ${formatQuantity(buyUnitQty, "unit")}. נא להסיר את כמות היחידות כדי להוסיף במשקל.`
      );
      return;
    }
    setModeHint("");
    setError("");
    setBuyKgQty(value);
  }

  function handleBuyUnitChange(value: number) {
    if (value > 0 && buyKgQty > 0) {
      setModeHint(
        `מוגדר לקנות ${formatQuantity(buyKgQty, "kg")}. נא להסיר את הכמות במשקל כדי להוסיף במספר היחידות.`
      );
      return;
    }
    setModeHint("");
    setError("");
    setBuyUnitQty(value);
  }

  async function handleAdd() {
    const buyKg = isWeightProduct ? buyKgQty : 0;
    const buyUnits = isWeightProduct ? buyUnitQty : buyUnitQty;

    if (buyKg > 0 && buyUnits > 0) {
      setError("ניתן לבחור רק קנייה לפי משקל או לפי יחידות — לא את שתיהן יחד");
      return;
    }

    const totalToBuy = isWeightProduct ? buyKg + buyUnits : buyUnitQty;

    if (totalToBuy <= 0) {
      setError("בחרו כמות לקנות");
      return;
    }

    setLoading(true);
    setError("");
    setModeHint("");
    try {
      const stockPayload = isWeightProduct
        ? {
            updateStockQuantity: stockKg,
            updateStockUnitCount: stockUnits,
          }
        : { updateStockQuantity: stockKg };

      const addedItems: unknown[] = [];
      let first = true;

      if (isWeightProduct && buyKg > 0) {
        const res = await fetch("/api/shopping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            quantity: buyKg,
            quantityUnit: "kg",
            store: store || null,
            ...(first ? stockPayload : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "שגיאה בהוספה");
          return;
        }
        addedItems.push(data);
        first = false;
      }

      if (buyUnits > 0) {
        const res = await fetch("/api/shopping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            quantity: buyUnits,
            quantityUnit: "unit",
            store: store || null,
            ...(first ? stockPayload : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "שגיאה בהוספה");
          return;
        }
        addedItems.push(data);
      }

      onAdded(addedItems, {
        ...product,
        quantity: stockKg,
        unitCount: isWeightProduct ? stockUnits : product.unitCount,
        store: store || null,
      });
      onClose();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-center mb-1">{product.name}</h2>

        {warnings.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
            {warnings.map((w) => (
              <p key={w} className="text-sm text-amber-800">
                ⚠️ {w}
              </p>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {isWeightProduct ? (
            <>
              <div className="p-3 rounded-xl bg-slate-50 border border-border space-y-3">
                <p className="text-xs font-bold text-slate-600">מלאי נוכחי</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted shrink-0">בק״ג</span>
                  <QuantityStepper
                    value={stockKg}
                    onChange={setStockKg}
                    unit="kg"
                    max={50}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted shrink-0">ביחידות</span>
                  <QuantityStepper
                    value={stockUnits}
                    onChange={setStockUnits}
                    unit="piece"
                    max={500}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 space-y-3">
                <p className="text-xs font-bold text-orange-800">כמה לקנות?</p>
                <p className="text-xs text-muted text-center -mt-1">
                  בוחרים או לפי משקל או לפי יחידות — לא את שתיהן יחד
                </p>

                <div
                  className={`flex items-center justify-between gap-2 p-2 rounded-xl border ${
                    buyKgQty > 0
                      ? "bg-white border-orange-300"
                      : "bg-white/60 border-transparent"
                  }`}
                >
                  <div className="shrink-0">
                    <span className="text-sm font-medium text-slate-700">
                      קנייה לפי משקל (ק״ג)
                    </span>
                    {kgPrice != null && (
                      <p className="text-xs text-muted">
                        {formatPrice(kgPrice)} {priceUnitLabel("kg")}
                      </p>
                    )}
                    {existingKg !== undefined && existingKg > 0 && (
                      <p className="text-xs text-muted">
                        ברשימה: {formatQuantity(existingKg, "kg")}
                      </p>
                    )}
                  </div>
                  <QuantityStepper
                    value={buyKgQty}
                    onChange={handleBuyKgChange}
                    unit="kg"
                    max={50}
                  />
                </div>

                <div
                  className={`flex items-center justify-between gap-2 p-2 rounded-xl border ${
                    buyUnitQty > 0
                      ? "bg-white border-orange-300"
                      : "bg-white/60 border-transparent"
                  }`}
                >
                  <div className="shrink-0">
                    <span className="text-sm font-medium text-slate-700">
                      קנייה לפי יחידות
                    </span>
                    {unitPrice != null && product.packagePrice != null && (
                      <p className="text-xs text-muted">
                        {formatPrice(unitPrice)} {priceUnitLabel("unit")}
                      </p>
                    )}
                    {existingUnits !== undefined && existingUnits > 0 && (
                      <p className="text-xs text-muted">
                        ברשימה: {formatQuantity(existingUnits, "unit")}
                      </p>
                    )}
                  </div>
                  <QuantityStepper
                    value={buyUnitQty}
                    onChange={handleBuyUnitChange}
                    unit="piece"
                    max={500}
                  />
                </div>
                <p className="text-xs text-muted text-center">
                  לדוגמה: שולחים לקנות 10 מלפחונים — מלאו בשורת יחידות בלבד
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-slate-600">כמות במלאי</label>
                <div className="mt-1 flex justify-center">
                  <QuantityStepper
                    value={stockKg}
                    onChange={setStockKg}
                    unit="unit"
                    max={500}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">כמה לקנות</label>
                <div className="mt-1 flex justify-center">
                  <QuantityStepper
                    value={buyUnitQty}
                    onChange={setBuyUnitQty}
                    unit="unit"
                    max={500}
                  />
                </div>
                {existingUnits !== undefined && existingUnits > 0 && (
                  <p className="text-xs text-muted text-center mt-1">
                    כבר ברשימה: {formatQuantity(existingUnits, "unit")}
                  </p>
                )}
              </div>
            </>
          )}

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

        {modeHint && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 text-center">
            ⚠️ {modeHint}
          </div>
        )}

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
