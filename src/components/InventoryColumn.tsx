"use client";

import { useMemo, useState } from "react";
import { groupByCategory, sortProductsByCategory } from "@/lib/categories";
import { generateInventoryPDF } from "@/lib/pdf";
import ProductThumbnail from "@/components/ProductThumbnail";
import ColumnRefreshButton from "@/components/ColumnRefreshButton";
import QuantityStepper from "@/components/QuantityStepper";
import {
  formatQuantity,
  priceUnitLabel,
  quantityStep,
  type QuantityUnit,
} from "@/lib/units";

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unitCount: number | null;
  quantityUnit: QuantityUnit;
  unitPrice: number | null;
  packagePrice: number | null;
  packageWeight: number | null;
  category: string;
  store: string | null;
  hasImage: boolean;
  imageUrl?: string | null;
  isMissing: boolean;
}

interface InventoryColumnProps {
  products: Product[];
  categories: string[];
  familyName: string;
  isHead: boolean;
  onProductsChange: (products: Product[]) => void;
  onEdit: (product: Product) => void;
  onManageCategories: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function formatPrice(price: number | null, unit?: QuantityUnit): string {
  if (price === null || price === undefined) return "—";
  return unit ? `₪${price.toFixed(2)} ${priceUnitLabel(unit)}` : `₪${price.toFixed(2)}`;
}

function AddProductBar({
  onAdd,
}: {
  onAdd: (name: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  async function addProduct() {
    if (!newName.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      await onAdd(newName.trim());
      setNewName("");
      setShowAdd(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setAdding(false);
    }
  }

  if (!showAdd) {
    return (
      <button
        onClick={() => setShowAdd(true)}
        className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-[var(--primary-hover)] transition flex items-center justify-center gap-2 text-sm"
      >
        <span>+</span> הוסף מוצר חדש
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setAddError("");
          }}
          placeholder="שם המוצר החדש"
          className="flex-1 px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && addProduct()}
        />
        <button
          onClick={addProduct}
          disabled={adding}
          className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60"
        >
          {adding ? "..." : "הוסף"}
        </button>
        <button
          onClick={() => {
            setShowAdd(false);
            setAddError("");
          }}
          className="px-2 py-2 rounded-xl bg-slate-100 text-slate-500 text-sm"
        >
          ✕
        </button>
      </div>
      {addError && <p className="text-xs text-red-500 px-1">{addError}</p>}
    </div>
  );
}

export default function InventoryColumn({
  products,
  categories,
  familyName,
  isHead,
  onProductsChange,
  onEdit,
  onManageCategories,
  onRefresh,
  refreshing = false,
}: InventoryColumnProps) {
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.store?.toLowerCase().includes(q) ?? false)
    );
  }, [products, search]);

  const groups = groupByCategory(filtered, categories);

  async function setQuantityField(
    id: string,
    field: "quantity" | "unitCount",
    value: number
  ) {
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const updated = await res.json();
      onProductsChange(
        sortProductsByCategory(
          products.map((p) => (p.id === id ? updated : p)),
          categories
        )
      );
    }
  }

  function optimisticQty(id: string, field: "quantity" | "unitCount", value: number) {
    onProductsChange(
      sortProductsByCategory(
        products.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
        categories
      )
    );
  }

  async function addProduct(name: string) {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity: 0 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "שגיאה בהוספת מוצר");
    onProductsChange(sortProductsByCategory([...products, data], categories));
  }

  async function downloadPDF() {
    setDownloading(true);
    try {
      await generateInventoryPDF({
        familyName,
        categories,
        date: new Date(),
        items: products.map((p) => ({
          name: p.name,
          quantity: 0,
          category: p.category,
          unitPrice: p.unitPrice,
          packagePrice: p.packagePrice,
          stockQuantity: p.quantity,
          stockUnitCount: p.unitCount,
          quantityUnit: p.quantityUnit,
          store: p.store,
        })),
      });
    } finally {
      setDownloading(false);
    }
  }

  function renderProductRow(product: Product) {
    const unitCount = product.unitCount ?? 0;
    const isKg = product.quantityUnit === "kg";
    const isEmpty = isKg
      ? product.quantity === 0 && unitCount === 0
      : product.quantity === 0;
    const isLow = isKg
      ? product.quantity <= 1 && unitCount <= 2
      : product.quantity <= 2;

    return (
      <div
        key={product.id}
        onClick={() => onEdit(product)}
        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition hover:shadow-md hover:border-primary/30 ${
          product.isMissing || isEmpty
            ? "bg-orange-50 border-orange-200"
            : isLow
              ? "bg-yellow-50 border-yellow-200"
              : "bg-white border-border"
        }`}
      >
        <div className="flex flex-col gap-1.5 shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
          {isKg ? (
            <>
              <QuantityStepper
                value={product.quantity}
                onChange={(v) => optimisticQty(product.id, "quantity", v)}
                onCommit={(v) => setQuantityField(product.id, "quantity", v)}
                unit="kg"
                unitLabel="ק״ג"
                compact
                max={50}
              />
              <QuantityStepper
                value={unitCount}
                onChange={(v) => optimisticQty(product.id, "unitCount", v)}
                onCommit={(v) => setQuantityField(product.id, "unitCount", v)}
                unit="piece"
                unitLabel="יחידות"
                compact
                max={500}
              />
            </>
          ) : (
            <QuantityStepper
              value={product.quantity}
              onChange={(v) => optimisticQty(product.id, "quantity", v)}
              onCommit={(v) => setQuantityField(product.id, "quantity", v)}
              unit="unit"
              unitLabel="יחידות"
              compact
              max={500}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 break-words leading-snug">
            {product.name}
          </p>
          {isKg && (product.quantity > 0 || unitCount > 0) && (
            <p className="text-xs text-muted mt-0.5">
              {formatQuantity(product.quantity, "kg")}
              {unitCount > 0 && ` · ${formatQuantity(unitCount, "unit")}`}
            </p>
          )}
          {(product.isMissing || isEmpty) && (
            <p className="text-xs text-orange-600 mt-0.5">חסר במלאי</p>
          )}
          {product.store && (
            <p className="text-xs text-green-700 mt-0.5">🏪 {product.store}</p>
          )}
          <p className="text-sm font-semibold text-slate-600 mt-1">
            {formatPrice(product.unitPrice, product.quantityUnit)}
          </p>
        </div>

        <ProductThumbnail
          productId={product.id}
          hasImage={product.hasImage}
          alt={product.name}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="shrink-0 px-5 py-4 border-b border-border bg-gradient-to-l from-blue-50 to-white space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>📦</span> מלאי
            </h2>
            <p className="text-xs text-muted mt-0.5">{products.length} מוצרים</p>
          </div>
          <div className="flex gap-1.5">
            {onRefresh && (
              <ColumnRefreshButton onRefresh={onRefresh} refreshing={refreshing} />
            )}
            <button
              onClick={downloadPDF}
              disabled={downloading || products.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-border text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              title="הורד PDF של המלאי"
            >
              {downloading ? "מכין..." : "📄 PDF"}
            </button>
            {isHead && (
              <button
                onClick={onManageCategories}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-border text-xs text-slate-600 hover:bg-slate-50"
              >
                🏷️ קטגוריות
              </button>
            )}
          </div>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש במלאי..."
          className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {isHead && <AddProductBar onAdd={addProduct} />}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted">
            <p className="text-sm">{search.trim() ? "לא נמצאו מוצרים" : "אין מוצרים עדיין"}</p>
          </div>
        )}
        {groups.map((group) => (
          <div key={group.category}>
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-2 py-1.5 mb-1">
              <p className="text-xs font-bold text-primary uppercase tracking-wide">
                {group.category}
              </p>
            </div>
            <div className="space-y-2">{group.items.map(renderProductRow)}</div>
          </div>
        ))}
      </div>

      <div className="shrink-0 p-3 border-t border-border bg-white">
        <button
          onClick={downloadPDF}
          disabled={downloading || products.length === 0}
          className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {downloading ? "מכין PDF..." : "📄 הורד PDF של המלאי"}
        </button>
      </div>
    </div>
  );
}
