"use client";

import { useState } from "react";
import ImageEditorModal from "@/components/ImageEditorModal";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import type { Product } from "@/components/InventoryColumn";

interface ProductEditModalProps {
  product: Product;
  categories: string[];
  isHead: boolean;
  onClose: () => void;
  onUpdate: (product: Product) => void;
  onDelete: (id: string) => void;
  onCategoriesChange: (categories: string[]) => void;
}

export default function ProductEditModal({
  product,
  categories,
  isHead,
  onClose,
  onUpdate,
  onDelete,
  onCategoriesChange,
}: ProductEditModalProps) {
  const [name, setName] = useState(product.name);
  const [quantity, setQuantity] = useState(product.quantity);
  const [category, setCategory] = useState(product.category || "אחר");
  const [unitPrice, setUnitPrice] = useState(
    product.unitPrice !== null ? String(product.unitPrice) : ""
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  async function save(updates: Partial<Product>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError("שגיאה בשמירה");
        return;
      }
      if (res.ok) {
        onUpdate(data as Product);
        onClose();
      } else {
        setError(data.error || "שגיאה בשמירה");
      }
    } catch {
      setError("שגיאת רשת. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onCategoriesChange(data.categories);
        setCategory(newCategoryName.trim());
        setNewCategoryName("");
        setShowNewCategory(false);
      } else {
        setError(data.error || "שגיאה בהוספת קטגוריה");
      }
    } finally {
      setAddingCategory(false);
    }
  }

  function handleSave() {
    if (!isHead) {
      save({ quantity });
      return;
    }

    const parsedPrice =
      unitPrice.trim() === "" ? null : Number(unitPrice.replace(",", "."));
    if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      setError("מחיר ליחידה לא תקין");
      return;
    }

    save({
      name,
      quantity,
      category,
      unitPrice: parsedPrice,
    });
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImage(file);
    e.target.value = "";
  }

  async function uploadProcessedImage(blob: Blob) {
    setUploading(true);
    setError("");
    try {
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const formData = new FormData();
      formData.append("image", blob, `product.${ext}`);
      const res = await fetch(`/api/products/${product.id}/image`, {
        method: "POST",
        body: formData,
      });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("שגיאה בהעלאת התמונה");
      }
      if (res.ok) {
        onUpdate(data as Product);
        setPendingImage(null);
      } else {
        throw new Error(data.error || "שגיאה בהעלאת התמונה");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "שגיאה בהעלאת התמונה";
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("למחוק את המוצר?")) return;
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (res.ok) {
      onDelete(product.id);
      onClose();
    }
  }

  return (
    <>
      {pendingImage && (
        <ImageEditorModal
          file={pendingImage}
          onClose={() => setPendingImage(null)}
          onSave={uploadProcessedImage}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">
              {isHead ? "עריכת מוצר" : "עדכון מלאי"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
            >
              ✕
            </button>
          </div>

          <div className="flex justify-center mb-5">
            {product.imageUrl ? (
              <div className="w-28 h-28 rounded-xl border border-border bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#f8fafc_0%_50%)] bg-[length:12px_12px] flex items-center justify-center overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-xl bg-slate-100 flex items-center justify-center text-3xl">
                📦
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">שם מוצר</label>
              {isHead ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              ) : (
                <p className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-slate-50 text-slate-800 font-medium">
                  {product.name}
                </p>
              )}
            </div>

            {isHead && (
              <>
            <div>
              <label className="text-sm font-medium text-slate-600">קטגוריה</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                    {(DEFAULT_CATEGORIES as readonly string[]).includes(cat) ? "" : " ✦"}
                  </option>
                ))}
              </select>
              {showNewCategory ? (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="שם קטגוריה חדשה"
                    className="flex-1 px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                    autoFocus
                  />
                  <button
                    onClick={addCategory}
                    disabled={addingCategory}
                    className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {addingCategory ? "..." : "הוסף"}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewCategory(false);
                      setNewCategoryName("");
                    }}
                    className="px-2 py-2 rounded-xl bg-slate-100 text-slate-500 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewCategory(true)}
                  className="text-xs text-primary mt-1.5 hover:underline"
                >
                  + הוסף קטגוריה חדשה
                </button>
              )}
              <p className="text-xs text-muted mt-1">נקבע אוטומטית לפי שם המוצר, ניתן לשנות ידנית</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">מחיר ליחידה (₪)</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                min={0}
                step={0.01}
                placeholder="לדוגמה: 5.90"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium text-slate-600">כמות במלאי</label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => setQuantity(Math.max(0, quantity - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 font-bold text-lg hover:bg-slate-200"
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                  className="flex-1 text-center px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg font-semibold"
                  min={0}
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-xl bg-slate-100 font-bold text-lg hover:bg-slate-200"
                >
                  +
                </button>
              </div>
            </div>

            {isHead && (
              <>
            <label className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary hover:bg-blue-50 transition">
              <span className="text-sm text-muted">
                {uploading ? "מעלה תמונה..." : "📷 צלם או בחר תמונה"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
                disabled={uploading}
              />
            </label>
            <p className="text-xs text-center text-muted -mt-2">
              אפשר לחתוך שוליים ולהסיר רקע כהה לפני השמירה
            </p>
              </>
            )}

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {loading ? "שומר..." : "שמור"}
              </button>
              <button
                onClick={() => save({ isMissing: true })}
                disabled={loading}
                className="px-4 py-3 rounded-xl bg-orange-50 text-orange-600 font-medium hover:bg-orange-100 border border-orange-200"
              >
                חסר!
              </button>
            </div>

            {isHead && (
            <button
              onClick={handleDelete}
              className="w-full py-2.5 rounded-xl text-red-500 text-sm hover:bg-red-50"
            >
              מחק מוצר
            </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
