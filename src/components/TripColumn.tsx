"use client";

import { useEffect, useMemo, useState } from "react";
import { groupByStoreThenCategory } from "@/lib/categories";
import { generateShoppingPDF } from "@/lib/pdf";
import type { ShoppingItem } from "@/components/ShoppingColumn";
import ColumnRefreshButton from "@/components/ColumnRefreshButton";
import type { Product } from "@/components/InventoryColumn";
import { formatQuantity, type QuantityUnit } from "@/lib/units";
import {
  shoppingItemPrice,
  shoppingItemPriceLabel,
  shoppingItemUnit,
} from "@/lib/shopping-price";

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "—";
  return `₪${price.toFixed(2)}`;
}

function itemPrice(item: ShoppingItem): number | null {
  return shoppingItemPrice(item, item.product);
}

function itemUnit(item: ShoppingItem): QuantityUnit {
  return shoppingItemUnit(item, item.product);
}

function itemPriceLabel(item: ShoppingItem): string {
  return shoppingItemPriceLabel(item, item.product);
}

interface FamilyMember {
  id: string;
  name: string;
  isHead: boolean;
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
  onRefresh?: () => void;
  refreshing?: boolean;
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
  onRefresh,
  refreshing = false,
}: TripColumnProps) {
  const [shopperName, setShopperName] = useState(actorName);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeMsg, setCompleteMsg] = useState("");

  const activeItems = items.filter((i) => !i.isChecked);

  const activeStoreGroups = useMemo(() => {
    const withMeta = activeItems.map((item) => ({
      ...item,
      category: item.product?.category ?? "חד-פעמי",
      store: item.store ?? item.product?.store ?? null,
    }));
    return groupByStoreThenCategory(withMeta, stores, [...categories, "חד-פעמי"]);
  }, [activeItems, categories, stores]);

  const cartCount = activeItems.filter((i) => i.inCart).length;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/family-members")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FamilyMember[]) => {
        if (!cancelled) setFamilyMembers(data);
      })
      .catch(() => {
        if (!cancelled) setFamilyMembers([]);
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (actorName) setShopperName(actorName);
  }, [actorName]);

  const shopperOptions = useMemo(() => {
    const names = new Set<string>();
    const options: FamilyMember[] = [];
    for (const member of familyMembers) {
      if (!names.has(member.name)) {
        names.add(member.name);
        options.push(member);
      }
    }
    if (actorName && !names.has(actorName)) {
      options.unshift({ id: "actor", name: actorName, isHead: false });
    }
    return options;
  }, [familyMembers, actorName]);

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
          packagePrice: item.product?.packagePrice ?? null,
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
          <div className="flex items-center gap-1">
            {onRefresh && (
              <ColumnRefreshButton onRefresh={onRefresh} refreshing={refreshing} />
            )}
            {isHead && (
              <button onClick={onManageStores} className="px-2 py-1.5 rounded-lg bg-white border text-xs">
                🏪 חנויות
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600">מי הולך לקנות?</label>
          {membersLoading ? (
            <p className="text-xs text-muted mt-2">טוען בני משפחה...</p>
          ) : shopperOptions.length === 0 ? (
            <p className="text-xs text-muted mt-2">אין בני משפחה רשומים</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {shopperOptions.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setShopperName(member.name)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${
                    shopperName === member.name
                      ? "bg-green-600 text-white border-green-600 shadow-sm"
                      : "bg-white text-slate-700 border-border hover:bg-green-50"
                  }`}
                >
                  {member.name}
                  {member.isHead && (
                    <span className="mr-1 text-xs opacity-80">👑</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {shopperName && (
            <p className="text-xs text-green-700 mt-2">נבחר/ה: {shopperName}</p>
          )}
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <h3 className="text-sm font-semibold mb-2">
            רשימה ({activeItems.length}) · בעגלה: {cartCount}
          </h3>
          {activeItems.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">אין פריטים</p>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {activeStoreGroups.map((storeGroup) => (
                <div key={storeGroup.store}>
                  <p className="text-sm font-bold text-green-800 mb-2 sticky top-0 bg-slate-50 py-1">
                    🏪 {storeGroup.store}
                  </p>
                  {storeGroup.categories.map((catGroup) => (
                    <div key={`${storeGroup.store}-${catGroup.category}`} className="mb-2">
                      <p className="text-xs font-bold text-primary mb-1 mr-1">
                        {catGroup.category}
                      </p>
                      {catGroup.items.map((item) => {
                        const price = itemPrice(item);
                        const unit = itemUnit(item);
                        return (
                          <label
                            key={item.id}
                            className={`flex items-start gap-2 p-2 rounded-lg mb-1 cursor-pointer ${
                              item.inCart
                                ? "bg-green-100 border border-green-200"
                                : "bg-white border border-border"
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
                                {price !== null && ` · ${formatPrice(price)} ${itemPriceLabel(item)}`}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ))}
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
