"use client";

import { useEffect, useState } from "react";
import ImageEditorModal from "@/components/ImageEditorModal";
import ProductThumbnail from "@/components/ProductThumbnail";
import QuantityStepper from "@/components/QuantityStepper";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import type { Product } from "@/components/InventoryColumn";
import {
  defaultUnitForCategory,
  formatQuantity,
  saleModeLabel,
  priceUnitLabel,
  quantityStep,
  type QuantityUnit,
  unitLabel,
} from "@/lib/units";

interface ProductEditModalProps {
  product: Product;
  categories: string[];
  stores: string[];
  isHead: boolean;
  onClose: () => void;
  onUpdate: (product: Product) => void;
  onDelete: (id: string) => void;
  onCategoriesChange: (categories: string[]) => void;
}

export default function ProductEditModal({
  product,
  categories,
  stores,
  isHead,
  onClose,
  onUpdate,
  onDelete,
  onCategoriesChange,
}: ProductEditModalProps) {
  const [name, setName] = useState(product.name);
  const [quantity, setQuantity] = useState(product.quantity);
  const [unitCount, setUnitCount] = useState(product.unitCount ?? 0);
  const [category, setCategory] = useState(product.category || "אחר");
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>(product.quantityUnit);
  const [unitTouched, setUnitTouched] = useState(
    product.quantityUnit !== defaultUnitForCategory(product.category || "אחר")
  );
  const [unitPrice, setUnitPrice] = useState(
    product.unitPrice !== null ? String(product.unitPrice) : ""
  );
  const [packagePrice, setPackagePrice] = useState(
    product.packagePrice !== null ? String(product.packagePrice) : ""
  );
  const [packageWeight, setPackageWeight] = useState(
    product.packageWeight !== null ? String(product.packageWeight) : ""
  );
  const [store, setStore] = useState(product.store || "");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [isMissing, setIsMissing] = useState(product.isMissing);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(
    product.imageUrl ?? null
  );

  useEffect(() => {
    if (product.imageUrl) {
      setPreviewImageUrl(product.imageUrl);
      return;
    }
    if (!product.hasImage) {
      setPreviewImageUrl(null);
      return;
    }

    let cancelled = false;
    fetch(`/api/products/${product.id}/image`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { imageUrl?: string | null } | null) => {
        if (!cancelled) setPreviewImageUrl(data?.imageUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setPreviewImageUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [product.id, product.hasImage, product.imageUrl]);

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
        if (updates.isMissing !== undefined) {
          setIsMissing((data as Product).isMissing);
        }
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
      save(
        quantityUnit === "kg"
          ? { quantity, unitCount }
          : { quantity }
      );
      return;
    }

    const parsedPrice =
      unitPrice.trim() === "" ? null : Number(unitPrice.replace(",", "."));
    const parsedPackagePrice =
      packagePrice.trim() === "" ? null : Number(packagePrice.replace(",", "."));
    const parsedPackageWeight =
      packageWeight.trim() === "" ? null : Number(packageWeight.replace(",", "."));
    if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      setError("מחיר לא תקין");
      return;
    }
    if (
      parsedPackagePrice !== null &&
      (Number.isNaN(parsedPackagePrice) || parsedPackagePrice < 0)
    ) {
      setError("מחיר לאריזה לא תקין");
      return;
    }
    if (
      parsedPackageWeight !== null &&
      (Number.isNaN(parsedPackageWeight) || parsedPackageWeight < 0)
    ) {
      setError("משקל אריזה לא תקין");
      return;
    }

    save({
      name,
      quantity,
      unitCount: quantityUnit === "kg" ? unitCount : null,
      category,
      quantityUnit,
      unitPrice: parsedPrice,
      packagePrice: parsedPackagePrice,
      packageWeight: parsedPackageWeight,
      store: store || null,
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
        const updated = data as Product;
        setPreviewImageUrl(URL.createObjectURL(blob));
        onUpdate(updated);
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
            {previewImageUrl ? (
              <div className="w-28 h-28 rounded-xl border border-border bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#f8fafc_0%_50%)] bg-[length:12px_12px] flex items-center justify-center overflow-hidden">
                <img
                  src={previewImageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : product.hasImage ? (
              <ProductThumbnail
                productId={product.id}
                hasImage={product.hasImage}
                alt={product.name}
                containerClassName="w-28 h-28 rounded-xl border border-border flex items-center justify-center overflow-hidden"
                className="w-full h-full object-contain"
              />
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
                onChange={(e) => {
                  const nextCategory = e.target.value;
                  setCategory(nextCategory);
                  if (!unitTouched) {
                    setQuantityUnit(defaultUnitForCategory(nextCategory));
                  }
                }}
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
              <label className="text-sm font-medium text-slate-600">איך נקנה את המוצר?</label>
              <select
                value={quantityUnit}
                onChange={(e) => {
                  setUnitTouched(true);
                  setQuantityUnit(e.target.value as QuantityUnit);
                }}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              >
                <option value="unit">{saleModeLabel("unit")}</option>
                <option value="kg">{saleModeLabel("kg")}</option>
              </select>
              <p className="text-xs text-muted mt-1">
                פירות, ירקות ודגים מוגדרים כברירת מחדל לפי משקל. אפשר לשנות לכל מוצר — למשל
                עגבניות שרי באריזה, או מוצר אחר שרוצים לקנות לפי ק״ג.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                מחיר {priceUnitLabel(quantityUnit)} (₪)
              </label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                min={0}
                step={0.01}
                placeholder={quantityUnit === "kg" ? "לדוגמה: 3.50" : "לדוגמה: 5.90"}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {quantityUnit === "kg" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    מחיר לאריזה / פלטה (₪) — אופציונלי
                  </label>
                  <input
                    type="number"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(e.target.value)}
                    min={0}
                    step={0.01}
                    placeholder="לדוגמה: 45 לפלטת סלמון"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-muted mt-1">
                    לקנייה לפי יחידה/פלטה ברשימת הקניות (למשל פלטה אחת של סלמון)
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    משקל אריזה ממוצע (ק״ג) — אופציונלי
                  </label>
                  <input
                    type="number"
                    value={packageWeight}
                    onChange={(e) => setPackageWeight(e.target.value)}
                    min={0}
                    step={0.01}
                    placeholder="לדוגמה: 0.4"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-muted mt-1">
                    לעדכון המלאי אחרי קנייה לפי אריזה
                  </p>
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
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
              </>
            )}

            {quantityUnit === "kg" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-600">מלאי בק״ג</label>
                  <div className="mt-1 flex justify-center">
                    <QuantityStepper
                      value={quantity}
                      onChange={setQuantity}
                      unit="kg"
                      max={50}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">מלאי ביחידות</label>
                  <div className="mt-1 flex justify-center">
                    <QuantityStepper
                      value={unitCount}
                      onChange={setUnitCount}
                      unit="piece"
                      max={500}
                    />
                  </div>
                  <p className="text-xs text-muted mt-1 text-center">
                    לדוגמה: 10 מלפפונים (לא לפי משקל)
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-slate-600">
                  כמות במלאי ({unitLabel(quantityUnit)})
                </label>
                <div className="mt-1 flex justify-center">
                  <QuantityStepper
                    value={quantity}
                    onChange={setQuantity}
                    unit="unit"
                    max={500}
                  />
                </div>
                <p className="text-xs text-muted mt-1 text-center">
                  יוצג כ־{formatQuantity(quantity, quantityUnit)}
                </p>
              </div>
            )}

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

            {(isMissing || product.isMissing) && (
              <p className="text-sm text-orange-600 text-center font-medium">
                מסומן כחסר במלאי
              </p>
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
              {isMissing ? (
                <button
                  onClick={() => save({ isMissing: false })}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl bg-green-50 text-green-700 font-medium hover:bg-green-100 border border-green-200"
                >
                  יש במלאי
                </button>
              ) : (
                <button
                  onClick={() => save({ isMissing: true })}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl bg-orange-50 text-orange-600 font-medium hover:bg-orange-100 border border-orange-200"
                >
                  חסר!
                </button>
              )}
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
