"use client";

import { useState } from "react";
import { groupByCategory, sortProductsByCategory } from "@/lib/categories";

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number | null;
  category: string;
  imageUrl: string | null;
  isMissing: boolean;
}

interface InventoryColumnProps {
  products: Product[];
  categories: string[];
  isHead: boolean;
  onProductsChange: (products: Product[]) => void;
  onEdit: (product: Product) => void;
  onManageCategories: () => void;
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  return `₪${price.toFixed(2)}`;
}

export default function InventoryColumn({
  products,
  categories,
  isHead,
  onProductsChange,
  onEdit,
  onManageCategories,
}: InventoryColumnProps) {
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const groups = groupByCategory(products, categories);

  async function quickUpdate(id: string, delta: number) {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const newQty = Math.max(0, product.quantity + delta);
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty }),
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

  async function addProduct() {
    if (!newName.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), quantity: 0 }),
      });
      const data = await res.json();
      if (res.ok) {
        onProductsChange(sortProductsByCategory([...products, data], categories));
        setNewName("");
        setShowAdd(false);
      } else {
        setAddError(data.error || "שגיאה בהוספת מוצר");
      }
    } finally {
      setAdding(false);
    }
  }

  function renderProductRow(product: Product) {
    return (
      <div
        key={product.id}
        onClick={() => onEdit(product)}
        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition hover:shadow-md hover:border-primary/30 ${
          product.isMissing || product.quantity === 0
            ? "bg-orange-50 border-orange-200"
            : product.quantity <= 2
              ? "bg-yellow-50 border-yellow-200"
              : "bg-white border-border"
        }`}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              quickUpdate(product.id, -1);
            }}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-sm"
          >
            −
          </button>
          <span className="w-8 text-center font-bold text-lg">{product.quantity}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              quickUpdate(product.id, 1);
            }}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-sm"
          >
            +
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 truncate">{product.name}</p>
          {(product.isMissing || product.quantity === 0) && (
            <p className="text-xs text-orange-600">חסר במלאי</p>
          )}
        </div>

        <span className="text-xs font-semibold text-slate-500 shrink-0 w-14 text-center">
          {formatPrice(product.unitPrice)}
        </span>

        {product.imageUrl ? (
          <div className="w-12 h-12 rounded-lg border border-border bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#f8fafc_0%_50%)] bg-[length:8px_8px] flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0">
            📦
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-gradient-to-l from-blue-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>📦</span> מלאי
            </h2>
            <p className="text-xs text-muted mt-0.5">{products.length} מוצרים</p>
          </div>
          {isHead && (
            <button
              onClick={onManageCategories}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-border text-xs text-slate-600 hover:bg-slate-50 transition"
              title="ניהול קטגוריות"
            >
              🏷️ קטגוריות
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {products.length === 0 && (
          <div className="text-center py-12 text-muted">
            <div className="text-4xl mb-2">🛒</div>
            <p className="text-sm">אין מוצרים עדיין</p>
            <p className="text-xs mt-1">
              {isHead ? "לחצו + להוספת מוצר" : "פנו לראש המשפחה להוספת מוצרים"}
            </p>
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

      {isHead && (
        <div className="p-3 border-t border-border">
          {showAdd ? (
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
                  className="flex-1 px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && addProduct()}
                />
                <button
                  onClick={addProduct}
                  disabled={adding}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60"
                >
                  {adding ? "..." : "הוסף"}
                </button>
                <button
                  onClick={() => {
                    setShowAdd(false);
                    setAddError("");
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-sm"
                >
                  ✕
                </button>
              </div>
              {addError && <p className="text-xs text-red-500 px-1">{addError}</p>}
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-[var(--primary-hover)] transition flex items-center justify-center gap-2 shadow-md shadow-blue-200/50"
            >
              <span className="text-lg">+</span> הוסף מוצר חדש
            </button>
          )}
        </div>
      )}
    </div>
  );
}
