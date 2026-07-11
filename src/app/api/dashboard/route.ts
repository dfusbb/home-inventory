import { prisma } from "@/lib/prisma";
import { requireVerifiedActor } from "@/lib/actor";
import { sortProductsByCategory } from "@/lib/categories";
import { getHouseholdCategoryNames } from "@/lib/categories-server";
import { getHouseholdStoreNames } from "@/lib/stores-server";
import { toProductListItem, toShoppingItemResponse } from "@/lib/product-map";

const shoppingInclude = {
  product: true,
} as const;

export async function GET() {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const householdId = result.session.householdId;

  try {
    const [rawProducts, shoppingItems, categories, stores] = await Promise.all([
      prisma.product.findMany({
        where: { householdId },
      }),
      prisma.shoppingItem.findMany({
        where: { householdId },
        include: shoppingInclude,
        orderBy: [{ isChecked: "asc" }, { createdAt: "desc" }],
      }),
      getHouseholdCategoryNames(householdId),
      getHouseholdStoreNames(householdId),
    ]);

    const products = rawProducts.map(toProductListItem);
    const normalizedShoppingItems = shoppingItems.map(toShoppingItemResponse);

    return Response.json({
      products: sortProductsByCategory(products, categories),
      shoppingItems: normalizedShoppingItems,
      categories,
      stores,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return Response.json(
      {
        error: "שגיאה בטעינת נתונים מהמסד",
        details:
          error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 }
    );
  }
}
