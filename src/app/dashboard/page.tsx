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
  const [recoveryMessage, setRecoveryMessage] = useState("");
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
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [mobileTab, setMobileTab] = useState<"inventory" | "shopping" | "trip">("inventory");

  const loadDashboardData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setDataLoading(true);
      setDataError("");
      setRecoveryMessage("");
    }
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        let nextProducts = data.products ?? [];
        if (!silent && nextProducts.length === 0) {
          const recoverRes = await fetch("/api/products/recover", { method: "POST" });
          if (recoverRes.ok) {
            const recovered = await recoverRes.json();
            if ((recovered.products ?? []).length > 0) {
              nextProducts = recovered.products;
              if (recovered.recovered > 0) {
                setRecoveryMessage(recovered.message || `שוחזרו ${recovered.recovered} מוצרים`);
              }
            }
          }
        }
        setProducts(nextProducts);
        setShoppingItems(data.shoppingItems ?? []);
        if (data.categories) setCategories(data.categories);
        if (data.stores) setStores(data.stores);
        setLastSyncedAt(new Date());
        return;
      }

      if (silent) return;

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
        let nextProducts = await productsRes.json();
        if (nextProducts.length === 0) {
          const recoverRes = await fetch("/api/products/recover", { method: "POST" });
          if (recoverRes.ok) {
            const recoveredData = await recoverRes.json();
            if ((recoveredData.products ?? []).length > 0) {
              nextProducts = recoveredData.products;
              if (recoveredData.recovered > 0) {
                setRecoveryMessage(
                  recoveredData.message || `שוחזרו ${recoveredData.recovered} מוצרים`
                );
              }
            }
          }
        }
        setProducts(nextProducts);
        recovered = nextProducts.length > 0;
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
      if (!silent) setDataError("שגיאת רשת בטעינת הנתונים");
    } finally {
      if (!silent) setDataLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboardData({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboardData]);

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

  useEffect(() => {
    if (!actorName) return;

    const poll = () => {
      if (document.visibilityState !== "visible") return;
      loadDashboardData({ silent: true });
    };

    const intervalId = window.setInterval(poll, 3000);
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [actorName, loadDashboardData]);

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
                  {lastSyncedAt && (
                    <span className="mr-1 text-green-600"> · מסונכרן</span>
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

      <main className="max-w-7xl mx-auto p-4 flex flex-col min-h-0 h-[calc(100vh-64px)] md:h-[calc(100vh-72px)]">
        {recoveryMessage && (
          <div className="mb-3 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 text-center">
            ✓ {recoveryMessage}
          </div>
        )}
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
          <div className="flex-1 min-h-0 flex flex-col">
        <div className="hidden md:grid md:grid-cols-3 gap-4 flex-1 min-h-0">
          <InventoryColumn
            products={products}
            categories={categories}
            familyName={familyName}
            isHead={isHead}
            onProductsChange={setProducts}
            onEdit={setEditingProduct}
            onManageCategories={() => setShowCategories(true)}
            onRefresh={handleRefresh}
            refreshing={refreshing}
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
            onRefresh={handleRefresh}
            refreshing={refreshing}
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
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        </div>

        <div className="md:hidden flex-1 min-h-0">
          {mobileTab === "inventory" && (
            <InventoryColumn
              products={products}
              categories={categories}
              familyName={familyName}
              isHead={isHead}
              onProductsChange={setProducts}
              onEdit={setEditingProduct}
              onManageCategories={() => setShowCategories(true)}
              onRefresh={handleRefresh}
              refreshing={refreshing}
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
              onRefresh={handleRefresh}
              refreshing={refreshing}
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
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
          )}
        </div>
          </div>
        )}
      </main>
    </div>
  );
}
