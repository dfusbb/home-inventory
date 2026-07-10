"use client";

import { useMemo, useState } from "react";
import { groupByCategory } from "@/lib/categories";
import type { Product } from "@/components/InventoryColumn";

interface ShoppingProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number | null;
  category: string;
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  isChecked: boolean;
  addedBy: string;
  createdAt: string;
  productId: string | null;
  product: ShoppingProduct | null;
}

interface ShoppingColumnProps {
  items: ShoppingItem[];
  products: Product[];
  categories: string[];
  onItemsChange: (items: ShoppingItem[]) => void;
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "";
  return `₪${price.toFixed(2)}`;
}

export default function ShoppingColumn({
  items,
  products,
  categories,
  onItemsChange,
}: ShoppingColumnProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pickQuantity, setPickQuantity] = useState(1);

  const activeItems = items.filter((i) => !i.isChecked);
  const boughtItems = items.filter((i) => i.isChecked);

  const activeProductIds = new Set(
    activeItems.map((i) => i.productId).filter(Boolean) as string[]
  );

  const availableProducts = useMemo(() => {
    const filtered = products.filter((p) => !activeProductIds.has(p.id));
    if (!search.trim()) return filtered;
    const q = search.trim().toLowerCase();
    return filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, activeProductIds, search]);

  const pickerGroups = groupByCategory(availableProducts, categories);

  async function addFromInventory(productId: string, quantity: number) {
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (res.ok) {
        onItemsChange([data, ...items]);
        setShowPicker(false);
        setSearch("");
        setSelectedProduct(null);
        setPickQuantity(1);
      } else {
        setAddError(data.error || "שגיאה בהוספה");
      }
    } finally {
      setAdding(false);
    }
  }

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    setPickQuantity(1);
    setAddError("");
  }

  async function updateQuantity(id: string, quantity: number) {
    const res = await fetch(`/api/shopping/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (res.ok) {
      const updated = await res.json();
      onItemsChange(items.map((i) => (i.id === id ? updated : i)));
    }
  }

  async function toggleCheck(id: string, isChecked: boolean) {
    const res = await fetch(`/api/shopping/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isChecked }),
    });
    if (res.ok) {
      const updated = await res.json();
      onItemsChange(items.map((i) => (i.id === id ? updated : i)));
    }
  }

  async function removeItem(id: string) {
    const res = await fetch(`/api/shopping/${id}`, { method: "DELETE" });
    if (res.ok) {
      onItemsChange(items.filter((i) => i.id !== id));
    }
  }

  return (
    <>
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-slide-up">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold">בחרו מהמלאי</h2>
                <p className="text-xs text-muted mt-0.5">רק מוצרים שכבר במלאי</p>
              </div>
              <button
                onClick={() => {
                  setShowPicker(false);
                  setSearch("");
                  setAddError("");
                  setSelectedProduct(null);
                  setPickQuantity(1);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="px-4 py-3 border-b border-border shrink-0">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש מוצר..."
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {selectedProduct ? (
                <div className="flex flex-col items-center py-6 px-4">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-20 h-20 rounded-xl object-contain border border-border mb-4"
                    />
                  ) : (
                    <span className="text-5xl mb-4">📦</span>
                  )}
                  <p className="font-bold text-lg text-slate-800 text-center mb-1">
                    {selectedProduct.name}
                  </p>
                  {selectedProduct.unitPrice != null && (
                    <p className="text-sm text-muted mb-6">
                      {formatPrice(selectedProduct.unitPrice)} ליחידה
                    </p>
                  )}
                  <p className="text-sm font-medium text-slate-600 mb-3">כמה לקנות?</p>
                  <div className="flex items-center gap-4 mb-6">
                    <button
                      onClick={() => setPickQuantity(Math.max(1, pickQuantity - 1))}
                      className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xl"
                    >
                      −
                    </button>
                    <span className="w-12 text-center font-bold text-2xl">{pickQuantity}</span>
                    <button
                      onClick={() => setPickQuantity(pickQuantity + 1)}
                      className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xl"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium"
                    >
                      חזור
                    </button>
                    <button
                      onClick={() => addFromInventory(selectedProduct.id, pickQuantity)}
                      disabled={adding}
                      className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-60"
                    >
                      {adding ? "..." : "הוסף לרשימה"}
                    </button>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-10 text-muted text-sm">
                  <p>אין מוצרים במלאי</p>
                  <p className="text-xs mt-1">הוסיפו מוצרים בעמודת המלאי קודם</p>
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="text-center py-10 text-muted text-sm">
                  {search.trim()
                    ? "לא נמצאו מוצרים"
                    : "כל המוצרים כבר ברשימת הקניות"}
                </div>
              ) : (
                pickerGroups.map((group) => (
                  <div key={group.category} className="mb-3">
                    <p className="text-xs font-bold text-primary px-2 py-1">
                      {group.category}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => selectProduct(product)}
                          disabled={adding}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:bg-orange-50 hover:border-orange-200 transition text-right disabled:opacity-60"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                              {product.name}
                            </p>
                            {product.unitPrice !== null && (
                              <p className="text-xs text-muted">
                                {formatPrice(product.unitPrice)} ליחידה
                              </p>
                            )}
                          </div>
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-contain border border-border shrink-0"
                            />
                          ) : (
                            <span className="text-lg shrink-0">📦</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {addError && (
              <p className="text-xs text-red-500 px-4 pb-3 shrink-0">{addError}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-gradient-to-l from-orange-50 to-white">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>🛍️</span> צריך לקנות
          </h2>
          <p className="text-xs text-muted mt-0.5">{activeItems.length} פריטים ברשימה</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeItems.length === 0 && (
            <div className="text-center py-12 text-muted">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-sm">הכל במלאי!</p>
              <p className="text-xs mt-1">לחצו למטה לבחירת מוצרים מהמלאי</p>
            </div>
          )}

          {activeItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white"
            >
              <button
                onClick={() => toggleCheck(item.id, true)}
                className="w-6 h-6 rounded-md border-2 border-slate-300 hover:border-primary hover:bg-blue-50 shrink-0 transition"
              />
              {item.product?.imageUrl ? (
                <img
                  src={item.product.imageUrl}
                  alt={item.name}
                  className="w-10 h-10 rounded-lg object-contain border border-border shrink-0"
                />
              ) : (
                <span className="text-lg shrink-0">📦</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-muted">נוסף ע&quot;י {item.addedBy}</p>
              </div>
              {item.product?.unitPrice != null && (
                <span className="text-xs font-semibold text-slate-500 shrink-0">
                  {formatPrice(item.product.unitPrice)}
                </span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-sm"
                >
                  −
                </button>
                <span className="w-7 text-center text-sm font-semibold text-slate-600">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-sm"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="text-slate-400 hover:text-red-500 text-sm"
              >
                ✕
              </button>
            </div>
          ))}

          {boughtItems.length > 0 && (
            <div className="pt-3">
              <p className="text-xs text-muted px-1 mb-2">נרכשו לאחרונה</p>
              {boughtItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg opacity-50">
                  <span className="text-green-500 text-sm">✓</span>
                  <p className="text-sm line-through text-slate-500">{item.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border">
          <button
            onClick={() => setShowPicker(true)}
            disabled={products.length === 0}
            className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="text-lg">+</span> בחרו מהמלאי
          </button>
        </div>
      </div>
    </>
  );
}
