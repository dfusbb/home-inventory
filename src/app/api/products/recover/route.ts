import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireVerifiedActor } from "@/lib/actor";
import { sortProductsByCategory } from "@/lib/categories";
import { getHouseholdCategoryNames } from "@/lib/categories-server";
import { toProductListItem } from "@/lib/product-map";
import {
  activeRecoveredProducts,
  defaultUnitForRecovered,
  mergeProductNames,
  replayProductLogs,
} from "@/lib/recover-products";
import { normalizeProductName } from "@/lib/categories";

export async function POST() {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const { actorName, session } = result;
  const householdId = session.householdId;

  const [existingProducts, logs, shoppingItems, categoryOrder] = await Promise.all([
    prisma.product.findMany({ where: { householdId } }),
    prisma.activityLog.findMany({
      where: { householdId, productName: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { action: true, details: true, productName: true },
    }),
    prisma.shoppingItem.findMany({
      where: { householdId },
      select: { name: true },
    }),
    getHouseholdCategoryNames(householdId),
  ]);

  const existingNames = new Set(
    existingProducts.map((p) => normalizeProductName(p.name))
  );

  const replayed = mergeProductNames(
    replayProductLogs(logs),
    shoppingItems.map((item) => item.name)
  );

  const toCreate = activeRecoveredProducts(replayed).filter(
    (item) => !existingNames.has(normalizeProductName(item.name))
  );

  if (toCreate.length === 0) {
    return Response.json({
      recovered: 0,
      message:
        existingProducts.length > 0
          ? "המוצרים כבר קיימים במלאי"
          : "לא נמצאו מוצרים לשחזור ביומן הפעילות",
      products: sortProductsByCategory(
        existingProducts.map(toProductListItem),
        categoryOrder
      ),
    });
  }

  const created = [];
  for (const item of toCreate) {
    const product = await prisma.product.create({
      data: {
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        quantityUnit: defaultUnitForRecovered(item.category),
        householdId,
      },
    });
    created.push(product);
  }

  const allProducts = [...existingProducts, ...created];

  await logActivity(
    householdId,
    actorName,
    "שחזור מלאי",
    `שוחזרו ${created.length} מוצרים מיומן הפעילות`
  );

  return Response.json({
    recovered: created.length,
    message: `שוחזרו ${created.length} מוצרים`,
    products: sortProductsByCategory(
      allProducts.map(toProductListItem),
      categoryOrder
    ),
  });
}
