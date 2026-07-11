"use client";

import { useMemo, useState } from "react";
import { groupByCategory } from "@/lib/categories";
import { generateShoppingPDF } from "@/lib/pdf";
import type { ShoppingItem } from "@/components/ShoppingColumn";
import type { Product } from "@/components/InventoryColumn";
import { formatQuantity, normalizeQuantityUnit, priceUnitLabel, type QuantityUnit } from "@/lib/units";

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "—";
  return `₪${price.toFixed(2)}`;
}

function itemPrice(item: ShoppingItem): number | null {
  return item.product?.unitPrice ?? item.unitPrice ?? null;
}

function itemUnit(item: ShoppingItem): QuantityUnit {
  return item.product?.quantityUnit ?? normalizeQuantityUnit(item.quantityUnit);
}

interface TripColumnProps {
  items: ShoppingItem[];
  products: Product[];
  categories: string[];
  stores: string[];
  familyName: string;
  actorName: string;
  isHead: boolean;
  onItemsChange: (items: ShoppingItem[]) => void;
  onProductsChange: (products: Product[]) => void;
  onManageStores: () => void;
}

export default function TripColumn({
  items,
  categories,
  stores,
  familyName,
  actorName,
  onItemsChange,
  onProductsChange,
  onManageStores,
  isHead,
}: TripColumnProps) {
  const [shopperName, setShopperName] = useState(actorName);
  const [downloading, setDownloading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeMsg, setCompleteMsg] = useState("");

  const activeItems = items.filter((i) => !i.isChecked);

  const activeGroups = useMemo(() => {
    const withCategory = activeItems.map((item) => ({
      ...item,
      category: item.product?.category ?? "חד-פעמי",
    }));
    return groupByCategory(withCategory, [...categories, "חד-פעמי"]);
  }, [activeItems, categories]);

  const cartCount = activeItems.filter((i) => i.inCart).length;

  const totalEstimate = activeItems.reduce((sum, item) => {
    const price = itemPrice(item);
    return price !== null ? sum + price * item.quantity : sum;
  }, 0);

  async function toggleInCart(id: string, inCart: boolean) {
    const res = await fetch(`/api/shopping/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inCart }),
    });
    if (res.ok) {
      const updated = await res.json();
      onItemsChange(items.map((i) => (i.id === id ? updated : i)));
    }
  }

  async function downloadPDF() {
    setDownloading(true);
    try {
      await generateShoppingPDF({
        familyName,
        shopperName: shopperName || "לא צוין",
        categories,
        stores,
        date: new Date(),
        items: activeItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          quantityUnit: itemUnit(item),
          category: item.product?.category ?? "חד-פעמי",
          store: item.store ?? item.product?.store,
          unitPrice: itemPrice(item),
        })),
      });
    } finally {
      setDownloading(false);
    }
  }

  async function completeShopping() {
    if (cartCount === 0) {
      alert("סמנו לפחות פריט אחד שנכנס לעגלה");
      return;
    }
    if (!confirm(`לסיים קנייה? ${cartCount} פריטים יתעדכנו במלאי`)) return;

    setCompleting(true);
    setCompleteMsg("");
    try {
      const res = await fetch("/api/shopping/complete", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        onItemsChange(data.items);
        if (data.products) onProductsChange(data.products);
        setCompleteMsg(data.message || "הקנייה הושלמה!");
      } else {
        alert(data.error || "שגיאה");
      }
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-gradient-to-l from-green-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>🚗</span> יוצאים לקניות
            </h2>
            <p className="text-xs text-muted">סמנו מה נכנס לעגלה</p>
          </div>
          {isHead && (
            <button onClick={onManageStores} className="px-2 py-1.5 rounded-lg bg-white border text-xs">
              🏪 חנויות
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600">מי הולך לקנות?</label>
          <input
            type="text"
            value={shopperName}
            onChange={(e) => setShopperName(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border text-sm"
          />
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <h3 className="text-sm font-semibold mb-2">
            רשימה ({activeItems.length}) · בעגלה: {cartCount}
          </h3>
          {activeItems.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">אין פריטים</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activeGroups.map((group) => (
                <div key={group.category}>
                  <p className="text-xs font-bold text-primary mb-1">{group.category}</p>
                  {group.items.map((item) => {
                    const price = itemPrice(item);
                    const unit = itemUnit(item);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-2 p-2 rounded-lg mb-1 cursor-pointer ${
                          item.inCart ? "bg-green-100 border border-green-200" : "bg-white border border-border"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.inCart}
                          onChange={(e) => toggleInCart(item.id, e.target.checked)}
                          className="w-5 h-5 mt-0.5 accent-green-600 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium break-words">{item.name}</p>
                          <p className="text-xs text-muted">
                            ×{formatQuantity(item.quantity, unit)}
                            {price !== null && ` · ${formatPrice(price)} ${priceUnitLabel(unit)}`}
                            {(item.store || item.product?.store) &&
                              ` · 🏪 ${item.store || item.product?.store}`}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {totalEstimate > 0 && (
          <p className="text-sm font-semibold text-center">
            סה״כ משוער: {formatPrice(totalEstimate)}
          </p>
        )}

        {completeMsg && (
          <p className="text-sm text-green-700 text-center bg-green-50 p-2 rounded-xl">
            ✓ {completeMsg}
          </p>
        )}

        <button
          onClick={completeShopping}
          disabled={completing || cartCount === 0}
          className="w-full py-3.5 rounded-xl bg-green-700 text-white font-bold disabled:opacity-50"
        >
          {completing ? "מעדכן..." : "✓ הקנייה הושלמה"}
        </button>

        <button
          onClick={downloadPDF}
          disabled={downloading || activeItems.length === 0}
          className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
        >
          {downloading ? "מכין PDF..." : "📄 הורד PDF לקנייה"}
        </button>
      </div>
    </div>
  );
}
