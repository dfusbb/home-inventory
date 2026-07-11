import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireVerifiedActor } from "@/lib/actor";
import { toProductListItem, toShoppingItemResponse } from "@/lib/product-map";
import { inventoryUpdateForPurchase } from "@/lib/shopping-price";
import { normalizeQuantityUnit } from "@/lib/units";

const shoppingInclude = {
  product: true,
} as const;

export async function POST() {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const { actorName, session } = result;
  const householdId = session.householdId;

  const cartItems = await prisma.shoppingItem.findMany({
    where: { householdId, isChecked: false, inCart: true },
    include: shoppingInclude,
  });

  let updatedInventory = 0;

  for (const item of cartItems) {
    if (item.isOneTime || !item.productId) {
      await prisma.shoppingItem.delete({ where: { id: item.id } });
      await logActivity(
        householdId,
        actorName,
        "קנייה חד-פעמית",
        `כמות: ${item.quantity}`,
        item.name
      );
      continue;
    }

    const product = item.product;
    const update = product
      ? inventoryUpdateForPurchase(item, {
          quantityUnit: normalizeQuantityUnit(product.quantityUnit),
          packageWeight: product.packageWeight,
        })
      : { quantity: item.quantity };

    await prisma.product.update({
      where: { id: item.productId },
      data: {
        ...(update.quantity !== undefined ? { quantity: { increment: update.quantity } } : {}),
        ...(update.unitCount !== undefined ? { unitCount: { increment: update.unitCount } } : {}),
        isMissing: false,
        ...(item.store ? { store: item.store } : {}),
      },
    });

    await prisma.shoppingItem.update({
      where: { id: item.id },
      data: { isChecked: true, inCart: false },
    });

    updatedInventory += 1;
    const addedLabel =
      update.unitCount !== undefined
        ? `+${update.unitCount} יחידות`
        : `+${update.quantity ?? item.quantity}`;
    await logActivity(
      householdId,
      actorName,
      "עדכון מלאי מקנייה",
      addedLabel,
      item.name
    );
  }

  await prisma.shoppingItem.updateMany({
    where: { householdId, isChecked: false, inCart: false },
    data: { inCart: false },
  });

  const [items, products] = await Promise.all([
    prisma.shoppingItem.findMany({
      where: { householdId },
      include: shoppingInclude,
      orderBy: [{ isChecked: "asc" }, { createdAt: "desc" }],
    }),
    prisma.product.findMany({
      where: { householdId },
    }),
  ]);

  return Response.json({
    success: true,
    updatedInventory,
    items: items.map(toShoppingItemResponse),
    products: products.map(toProductListItem),
    message:
      updatedInventory > 0
        ? `עודכנו ${updatedInventory} פריטים במלאי`
        : "הקנייה הושלמה",
  });
}
