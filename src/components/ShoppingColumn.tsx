"use client";

import { useMemo, useState } from "react";
import { groupByCategory } from "@/lib/categories";
import { generateShoppingPDF } from "@/lib/pdf";
import type { Product } from "@/components/InventoryColumn";
import AddToShoppingModal from "@/components/AddToShoppingModal";
import ProductThumbnail from "@/components/ProductThumbnail";
import {
  formatQuantity,
  normalizeQuantityUnit,
  priceUnitLabel,
  quantityStep,
  type QuantityUnit,
} from "@/lib/units";

interface ShoppingProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number | null;
  category: string;
  store: string | null;
  quantity: number;
  quantityUnit: QuantityUnit;
  hasImage: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  quantityUnit: QuantityUnit;
  unitPrice: number | null;
  store: string | null;
  isOneTime: boolean;
  inCart: boolean;
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
  stores: string[];
  familyName: string;
  isHead: boolean;
  onItemsChange: (items: ShoppingItem[]) => void;
  onProductsChange: (products: Product[]) => void;
  onManageCategories: () => void;
  onManageStores: () => void;
}

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

export default function ShoppingColumn({
  items,
  products,
  categories,
  stores,
  familyName,
  isHead,
  onItemsChange,
  onProductsChange,
  onManageCategories,
  onManageStores,
}: ShoppingColumnProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showOneTime, setShowOneTime] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [addModalProduct, setAddModalProduct] = useState<Product | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [oneTimeName, setOneTimeName] = useState("");
  const [oneTimeQty, setOneTimeQty] = useState(1);
  const [oneTimeUnit, setOneTimeUnit] = useState<QuantityUnit>("unit");
  const [oneTimeStore, setOneTimeStore] = useState("");
  const [oneTimePrice, setOneTimePrice] = useState("");
  const [oneTimeLoading, setOneTimeLoading] = useState(false);
  const [oneTimeError, setOneTimeError] = useState("");

  const activeItems = items.filter((i) => !i.isChecked);
  const boughtItems = items.filter((i) => i.isChecked);

  const filteredList = useMemo(() => {
    if (!listSearch.trim()) return activeItems;
    const q = listSearch.trim().toLowerCase();
    return activeItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.product?.category.toLowerCase().includes(q) ?? false) ||
        (i.store?.toLowerCase().includes(q) ?? false)
    );
  }, [activeItems, listSearch]);

  const activeGroups = useMemo(() => {
    const withCategory = filteredList.map((item) => ({
      ...item,
      category: item.product?.category ?? "חד-פעמי",
    }));
    return groupByCategory(withCategory, [...categories, "חד-פעמי"]);
  }, [filteredList, categories]);

  const pickerProducts = useMemo(() => {
    if (!pickerSearch.trim()) return products;
    const q = pickerSearch.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.store?.toLowerCase().includes(q) ?? false)
    );
  }, [products, pickerSearch]);

  const pickerGroups = groupByCategory(pickerProducts, categories);

  const totalEstimate = activeItems.reduce((sum, item) => {
    const price = itemPrice(item);
    return price !== null ? sum + price * item.quantity : sum;
  }, 0);

  function getWarnings(product: Product): string[] {
    const warnings: string[] = [];
    if (product.quantity > 0) {
      warnings.push(`קיים במלאי: ${formatQuantity(product.quantity, product.quantityUnit)}`);
    }
    const recent = items.find((i) => i.productId === product.id && i.isChecked);
    if (recent) warnings.push("נרכש לאחרונה");
    return warnings;
  }

  function getExistingListQty(productId: string): number | undefined {
    const existing = activeItems.find((i) => i.productId === productId);
    return existing?.quantity;
  }

  function handleProductSelect(product: Product) {
    setAddModalProduct(product);
  }

  function handleAdded(item: ShoppingItem, updatedProduct?: Product) {
    const existing = items.find((i) => i.id === item.id);
    if (existing) {
      onItemsChange(items.map((i) => (i.id === item.id ? (item as ShoppingItem) : i)));
    } else {
      onItemsChange([item as ShoppingItem, ...items]);
    }
    if (updatedProduct) {
      onProductsChange(
        products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
    }
    setShowPicker(false);
    setPickerSearch("");
  }

  async function addOneTime() {
    if (!oneTimeName.trim()) return;
    setOneTimeLoading(true);
    setOneTimeError("");
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isOneTime: true,
          name: oneTimeName.trim(),
          quantity: oneTimeQty,
          quantityUnit: oneTimeUnit,
          store: oneTimeStore || null,
          unitPrice: oneTimePrice.trim() === "" ? null : Number(oneTimePrice),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOneTimeError(data.error || "שגיאה");
        return;
      }
      onItemsChange([data, ...items]);
      setShowOneTime(false);
      setOneTimeName("");
      setOneTimeQty(1);
      setOneTimeUnit("unit");
      setOneTimeStore("");
      setOneTimePrice("");
    } finally {
      setOneTimeLoading(false);
    }
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

  async function removeItem(id: string) {
    const res = await fetch(`/api/shopping/${id}`, { method: "DELETE" });
    if (res.ok) onItemsChange(items.filter((i) => i.id !== id));
  }

  async function downloadPDF() {
    setDownloading(true);
    try {
      await generateShoppingPDF({
        familyName,
        shopperName: "רשימת קניות",
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

  function renderItemRow(item: ShoppingItem) {
    const price = itemPrice(item);
    const unit = itemUnit(item);
    const step = quantityStep(unit);
    return (
      <div
        key={item.id}
        className="flex items-start gap-3 p-3 rounded-xl border border-border bg-white"
      >
        {item.product?.hasImage ? (
          <ProductThumbnail
            productId={item.product.id}
            hasImage={item.product.hasImage}
            alt={item.name}
            containerClassName="w-12 h-12 rounded-lg border border-border flex items-center justify-center overflow-hidden shrink-0"
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-lg shrink-0 w-12 text-center pt-1">
            {item.isOneTime ? "🛒" : "📦"}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 break-words leading-snug">
            {item.name}
            {item.isOneTime && (
              <span className="text-xs text-purple-600 mr-1"> (חד-פעמי)</span>
            )}
          </p>
          <p className="text-xs text-muted mt-0.5">נוסף ע&quot;י {item.addedBy}</p>
          {(item.store || item.product?.store) && (
            <p className="text-xs text-green-700 mt-0.5">
              🏪 {item.store || item.product?.store}
            </p>
          )}
          <p className="text-sm font-semibold text-slate-600 mt-1">
            {formatPrice(price)}
            {price !== null && ` ${priceUnitLabel(unit)}`}
            {price !== null && (
              <span className="text-xs text-muted font-normal mr-1">
                {" "}
                (סה״כ {formatPrice(price * item.quantity)})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => updateQuantity(item.id, Math.max(step, item.quantity - step))}
            className="w-7 h-7 rounded-lg bg-slate-100 font-bold text-sm"
          >
            −
          </button>
          <span className="w-14 text-center text-xs font-semibold">
            {formatQuantity(item.quantity, unit)}
          </span>
          <button
            onClick={() => updateQuantity(item.id, item.quantity + step)}
            className="w-7 h-7 rounded-lg bg-slate-100 font-bold text-sm"
          >
            +
          </button>
        </div>
        <button
          onClick={() => removeItem(item.id)}
          className="text-slate-400 hover:text-red-500 text-sm shrink-0"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <>
      {addModalProduct && (
        <AddToShoppingModal
          product={addModalProduct}
          stores={stores}
          warnings={getWarnings(addModalProduct)}
          existingListQty={getExistingListQty(addModalProduct.id)}
          onClose={() => setAddModalProduct(null)}
          onAdded={(item, updated) =>
            handleAdded(item as ShoppingItem, updated)
          }
        />
      )}

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-slide-up">
            <div className="px-5 py-4 border-b border-border flex justify-between shrink-0">
              <h2 className="text-lg font-bold">בחרו מהמלאי</h2>
              <button
                onClick={() => {
                  setShowPicker(false);
                  setPickerSearch("");
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-3 border-b shrink-0">
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="חיפוש..."
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {pickerProducts.length === 0 ? (
                <p className="text-center text-muted text-sm py-8">לא נמצאו מוצרים</p>
              ) : (
                pickerGroups.map((group) => (
                  <div key={group.category} className="mb-3">
                    <p className="text-xs font-bold text-primary px-2 py-1">{group.category}</p>
                    {group.items.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className="w-full flex items-start gap-3 p-3 rounded-xl border border-border mb-1 hover:bg-orange-50 text-right"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium break-words">{product.name}</p>
                          <p className="text-xs text-muted">
                            במלאי: {formatQuantity(product.quantity, product.quantityUnit)} · {formatPrice(product.unitPrice)} {product.unitPrice != null ? priceUnitLabel(product.quantityUnit) : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showOneTime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">הוספת קנייה חד-פעמית</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={oneTimeName}
                onChange={(e) => setOneTimeName(e.target.value)}
                placeholder="שם המוצר (מחבת, מזגן...)"
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <span className="text-sm">כמות:</span>
                <button onClick={() => setOneTimeQty(Math.max(quantityStep(oneTimeUnit), oneTimeQty - quantityStep(oneTimeUnit)))} className="w-8 h-8 rounded-lg bg-slate-100 font-bold">−</button>
                <input
                  type="number"
                  value={oneTimeQty}
                  onChange={(e) => setOneTimeQty(Math.max(quantityStep(oneTimeUnit), Number(e.target.value)))}
                  className="w-20 text-center px-2 py-1.5 rounded-lg border border-border font-bold"
                  min={quantityStep(oneTimeUnit)}
                  step={quantityStep(oneTimeUnit)}
                />
                <button onClick={() => setOneTimeQty(oneTimeQty + quantityStep(oneTimeUnit))} className="w-8 h-8 rounded-lg bg-slate-100 font-bold">+</button>
              </div>
              <select
                value={oneTimeUnit}
                onChange={(e) => setOneTimeUnit(e.target.value as QuantityUnit)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
              >
                <option value="unit">יחידות</option>
                <option value="kg">ק״ג</option>
              </select>
              <div>
                <label className="text-xs text-muted">מחיר {priceUnitLabel(oneTimeUnit)}</label>
                <input
                  type="number"
                  value={oneTimePrice}
                  onChange={(e) => setOneTimePrice(e.target.value)}
                  placeholder="מחיר (אופציונלי)"
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border text-sm"
                  min={0}
                  step={0.01}
                />
              </div>
              <select
                value={oneTimeStore}
                onChange={(e) => setOneTimeStore(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white"
              >
                <option value="">חנות (אופציונלי)</option>
                {stores.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {oneTimeError && <p className="text-xs text-red-500 mt-2">{oneTimeError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowOneTime(false)} className="flex-1 py-3 rounded-xl bg-slate-100">ביטול</button>
              <button onClick={addOneTime} disabled={oneTimeLoading} className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-60">
                {oneTimeLoading ? "..." : "הוסף"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-gradient-to-l from-orange-50 to-white space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>🛍️</span> צריך לקנות
              </h2>
              <p className="text-xs text-muted">{activeItems.length} פריטים</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={downloadPDF}
                disabled={downloading || activeItems.length === 0}
                className="px-2 py-1.5 rounded-lg bg-white border text-xs disabled:opacity-50"
              >
                📄 PDF
              </button>
              {isHead && (
                <>
                  <button onClick={onManageStores} className="px-2 py-1.5 rounded-lg bg-white border text-xs">🏪</button>
                  <button onClick={onManageCategories} className="px-2 py-1.5 rounded-lg bg-white border text-xs">🏷️</button>
                </>
              )}
            </div>
          </div>
          <input
            type="text"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="חיפוש ברשימה..."
            className="w-full px-3 py-2 rounded-xl border border-border text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filteredList.length === 0 && (
            <div className="text-center py-10 text-muted text-sm">אין פריטים ברשימה</div>
          )}
          {activeGroups.map((group) => (
            <div key={group.category}>
              <div className="sticky top-0 z-10 bg-card/95 px-2 py-1.5 mb-1">
                <p className="text-xs font-bold text-primary">{group.category}</p>
              </div>
              <div className="space-y-2">{group.items.map(renderItemRow)}</div>
            </div>
          ))}
          {boughtItems.length > 0 && (
            <div className="pt-2 opacity-60">
              <p className="text-xs text-muted mb-1">נרכשו לאחרונה</p>
              {boughtItems.slice(0, 5).map((item) => (
                <p key={item.id} className="text-sm line-through text-slate-500">{item.name}</p>
              ))}
            </div>
          )}
        </div>

        {totalEstimate > 0 && (
          <p className="text-center text-sm font-semibold text-slate-700 py-2 border-t border-border">
            סה״כ משוער: {formatPrice(totalEstimate)}
          </p>
        )}

        <div className="p-3 border-t border-border space-y-2">
          <button
            onClick={() => setShowPicker(true)}
            className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm"
          >
            + בחרו מהמלאי
          </button>
          <button
            onClick={() => setShowOneTime(true)}
            className="w-full py-2.5 rounded-xl bg-purple-100 text-purple-800 font-medium text-sm"
          >
            + קנייה חד-פעמית
          </button>
        </div>
      </div>
    </>
  );
}
