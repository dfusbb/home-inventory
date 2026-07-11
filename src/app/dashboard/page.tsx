"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ActorModal from "@/components/ActorModal";
import InventoryColumn, { type Product } from "@/components/InventoryColumn";
import ShoppingColumn from "@/components/ShoppingColumn";
import TripColumn from "@/components/TripColumn";
import ProductEditModal from "@/components/ProductEditModal";
import FamilyMembersPanel from "@/components/FamilyMembersPanel";
import CategoriesPanel from "@/components/CategoriesPanel";
import StoresPanel from "@/components/StoresPanel";
import ReportsPanel from "@/components/ReportsPanel";
import { DEFAULT_CATEGORIES, sortProductsByCategory } from "@/lib/categories";
import type { ShoppingItem } from "@/components/ShoppingColumn";

export default function DashboardPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [actorName, setActorName] = useState<string | null>(null);
  const [isHead, setIsHead] = useState(false);
  const [showActorModal, setShowActorModal] = useState(false);
  const [showFamilyPanel, setShowFamilyPanel] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showStores, setShowStores] = useState(false);
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [stores, setStores] = useState<string[]>([]);
  const [mobileTab, setMobileTab] = useState<"inventory" | "shopping" | "trip">("inventory");

  const loadDashboardData = useCallback(async () => {
    setDataLoading(true);
    setDataError("");
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
        setShoppingItems(data.shoppingItems ?? []);
        if (data.categories) setCategories(data.categories);
        if (data.stores) setStores(data.stores);
        return;
      }

      const err = await res.json().catch(() => ({}));
      setDataError(err.error || "שגיאה בטעינת המלאי");

      const [productsRes, shoppingRes, categoriesRes, storesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/shopping"),
        fetch("/api/categories"),
        fetch("/api/stores"),
      ]);

      let recovered = false;
      if (productsRes.ok) {
        setProducts(await productsRes.json());
        recovered = true;
      }
      if (shoppingRes.ok) {
        setShoppingItems(await shoppingRes.json());
        recovered = true;
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories);
      }
      if (storesRes.ok) {
        const data = await storesRes.json();
        setStores(data.stores);
      }
      if (recovered) setDataError("");
    } catch {
      setDataError("שגיאת רשת בטעינת הנתונים");
    } finally {
      setDataLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");

    if (!meRes.ok) {
      router.push("/");
      return;
    }

    const me = await meRes.json();
    if (!me.authenticated) {
      router.push("/");
      return;
    }

    if (me.isAdmin) {
      router.push("/admin");
      return;
    }

    setFamilyName(me.familyName);
    setAuthLoading(false);

    if (!me.actorValid) {
      setShowActorModal(true);
      return;
    }

    setActorName(me.actorName);
    setIsHead(me.isHead);
    await loadDashboardData();
  }, [router, loadDashboardData]);

  async function handleActorComplete(name: string, head?: boolean) {
    setActorName(name);
    setIsHead(!!head);
    setShowActorModal(false);
    await loadDashboardData();
  }

  async function switchUser() {
    await fetch("/api/auth/actor/clear", { method: "POST" });
    setActorName(null);
    setIsHead(false);
    setProducts([]);
    setShoppingItems([]);
    setShowActorModal(true);
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🏠</div>
          <p className="text-muted">מתחבר...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {showActorModal && (
        <ActorModal
          mode="household"
          onComplete={handleActorComplete}
        />
      )}

      {showFamilyPanel && (
        <FamilyMembersPanel onClose={() => setShowFamilyPanel(false)} />
      )}

      {showCategories && (
        <CategoriesPanel
          categories={categories}
          onClose={() => setShowCategories(false)}
          onCategoriesChange={setCategories}
        />
      )}

      {showStores && (
        <StoresPanel
          stores={stores}
          onClose={() => setShowStores(false)}
          onStoresChange={setStores}
        />
      )}

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          categories={categories}
          stores={stores}
          isHead={isHead}
          onClose={() => setEditingProduct(null)}
          onUpdate={(updated) => {
            setProducts((prev) =>
              sortProductsByCategory(
                prev.map((p) => (p.id === updated.id ? updated : p)),
                categories
              )
            );
            setEditingProduct(updated);
            if (!updated.isMissing) {
              setShoppingItems((prev) =>
                prev.filter((i) => i.productId !== updated.id || i.isChecked)
              );
            }
          }}
          onDelete={(id) => {
            setProducts((prev) => prev.filter((p) => p.id !== id));
            setEditingProduct(null);
          }}
          onCategoriesChange={setCategories}
        />
      )}

      {showReports && <ReportsPanel onClose={() => setShowReports(false)} />}

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏠</span>
            <div>
              <h1 className="font-bold text-slate-800">משפחת {familyName}</h1>
              {actorName && (
                <p className="text-xs text-muted">
                  מחובר/ת: {actorName}
                  {isHead && (
                    <span className="mr-1 text-indigo-600"> · ראש משפחה</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHead && actorName && (
              <button
                onClick={() => setShowFamilyPanel(true)}
                className="px-3 py-2 rounded-xl bg-indigo-50 text-sm text-indigo-700 hover:bg-indigo-100 transition"
              >
                👨‍👩‍👧‍👦 בני משפחה
              </button>
            )}
            {actorName && (
              <button
                onClick={switchUser}
                className="px-3 py-2 rounded-xl bg-slate-100 text-sm text-slate-600 hover:bg-slate-200 transition"
              >
                החלף משתמש
              </button>
            )}
            <button
              onClick={() => setShowReports(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 text-sm text-slate-600 hover:bg-slate-200 transition"
            >
              📊 דוחות
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-slate-100 text-sm text-slate-600 hover:bg-slate-200 transition"
            >
              יציאה
            </button>
          </div>
        </div>

        <div className="md:hidden flex border-t border-border">
          {[
            { id: "inventory" as const, label: "מלאי", icon: "📦" },
            { id: "shopping" as const, label: "לקנות", icon: "🛍️" },
            { id: "trip" as const, label: "קניות", icon: "🚗" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-medium transition ${
                mobileTab === tab.id
                  ? "text-primary border-b-2 border-primary bg-blue-50/50"
                  : "text-muted"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 h-[calc(100vh-64px)] md:h-[calc(100vh-72px)]">
        {dataError && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 text-center">
            {dataError}
            <p className="text-xs mt-1 text-red-600">
              המוצרים כנראה לא נמחקו — נסו לרענן את האפליקציה.
            </p>
          </div>
        )}
        {!actorName ? (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            הקלידו שם רשום כדי להמשיך
          </div>
        ) : dataLoading ? (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            <div className="text-center">
              <div className="text-3xl mb-2 animate-pulse">📦</div>
              טוען נתונים...
            </div>
          </div>
        ) : (
          <>
        <div className="hidden md:grid md:grid-cols-3 gap-4 h-full">
          <InventoryColumn
            products={products}
            categories={categories}
            familyName={familyName}
            isHead={isHead}
            onProductsChange={setProducts}
            onEdit={setEditingProduct}
            onManageCategories={() => setShowCategories(true)}
          />
          <ShoppingColumn
            items={shoppingItems}
            products={products}
            categories={categories}
            stores={stores}
            familyName={familyName}
            isHead={isHead}
            onItemsChange={setShoppingItems}
            onProductsChange={setProducts}
            onManageCategories={() => setShowCategories(true)}
            onManageStores={() => setShowStores(true)}
          />
          <TripColumn
            items={shoppingItems}
            products={products}
            categories={categories}
            stores={stores}
            familyName={familyName}
            actorName={actorName || ""}
            isHead={isHead}
            onItemsChange={setShoppingItems}
            onProductsChange={setProducts}
            onManageStores={() => setShowStores(true)}
          />
        </div>

        <div className="md:hidden h-full">
          {mobileTab === "inventory" && (
            <InventoryColumn
              products={products}
              categories={categories}
              familyName={familyName}
              isHead={isHead}
              onProductsChange={setProducts}
              onEdit={setEditingProduct}
              onManageCategories={() => setShowCategories(true)}
            />
          )}
          {mobileTab === "shopping" && (
            <ShoppingColumn
              items={shoppingItems}
              products={products}
              categories={categories}
              stores={stores}
              familyName={familyName}
              isHead={isHead}
              onItemsChange={setShoppingItems}
              onProductsChange={setProducts}
              onManageCategories={() => setShowCategories(true)}
              onManageStores={() => setShowStores(true)}
            />
          )}
          {mobileTab === "trip" && (
            <TripColumn
              items={shoppingItems}
              products={products}
              categories={categories}
              stores={stores}
              familyName={familyName}
              actorName={actorName || ""}
              isHead={isHead}
              onItemsChange={setShoppingItems}
              onProductsChange={setProducts}
              onManageStores={() => setShowStores(true)}
            />
          )}
        </div>
          </>
        )}
      </main>
    </div>
  );
}
