import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireVerifiedActor } from "@/lib/actor";
import { isValidHouseholdStore } from "@/lib/stores-server";
import { normalizeQuantityUnit } from "@/lib/units";
import { shoppingItemPrice } from "@/lib/shopping-price";
import { toShoppingItemResponse } from "@/lib/product-map";

const shoppingInclude = {
  product: true,
} as const;

export async function GET() {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const items = await prisma.shoppingItem.findMany({
    where: { householdId: result.session.householdId },
    include: shoppingInclude,
    orderBy: [{ isChecked: "asc" }, { createdAt: "desc" }],
  });

  return Response.json(items.map(toShoppingItemResponse));
}

export async function POST(request: Request) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const { actorName, session } = result;
  const body = await request.json();
  const {
    productId,
    name,
    quantity = 1,
    store,
    isOneTime,
    updateStockQuantity,
    updateStockUnitCount,
    quantityUnit,
  } = body;

  const qty = Math.max(0.1, Number(quantity) || 1);
  const resolvedStore = store?.trim() || null;

  if (resolvedStore) {
    const valid = await isValidHouseholdStore(session.householdId, resolvedStore);
    if (!valid) {
      return Response.json({ error: "חנות לא רשומה" }, { status: 400 });
    }
  }

  if (isOneTime || (!productId && name?.trim())) {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      return Response.json({ error: "יש להזין שם מוצר" }, { status: 400 });
    }

    const item = await prisma.shoppingItem.create({
      data: {
        name: trimmedName,
        quantity: qty,
        quantityUnit: normalizeQuantityUnit(quantityUnit),
        store: resolvedStore,
        unitPrice:
          body.unitPrice !== undefined && body.unitPrice !== null && body.unitPrice !== ""
            ? Math.max(0, Number(body.unitPrice))
            : null,
        isOneTime: true,
        householdId: session.householdId,
        addedBy: actorName,
      },
      include: shoppingInclude,
    });

    await logActivity(
      session.householdId,
      actorName,
      "הוספה חד-פעמית לקניות",
      `כמות: ${qty}`,
      trimmedName
    );

    return Response.json(toShoppingItemResponse(item), { status: 201 });
  }

  if (!productId) {
    return Response.json({ error: "יש לבחור מוצר" }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, householdId: session.householdId },
  });

  if (!product) {
    return Response.json({ error: "מוצר לא נמצא במלאי" }, { status: 404 });
  }

  const productUnit = normalizeQuantityUnit(product.quantityUnit);
  const buyUnit =
    productUnit === "kg"
      ? normalizeQuantityUnit(quantityUnit ?? productUnit)
      : "unit";
  const lineUnitPrice = shoppingItemPrice(
    { quantityUnit: buyUnit },
    {
      quantityUnit: productUnit,
      unitPrice: product.unitPrice,
      packagePrice: product.packagePrice,
    }
  );

  if (updateStockQuantity !== undefined || updateStockUnitCount !== undefined) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        ...(updateStockQuantity !== undefined
          ? { quantity: Math.max(0, Number(updateStockQuantity) || 0) }
          : {}),
        ...(updateStockUnitCount !== undefined
          ? { unitCount: Math.max(0, Number(updateStockUnitCount) || 0) }
          : {}),
        store: resolvedStore ?? product.store,
      },
    });
  } else if (resolvedStore) {
    await prisma.product.update({
      where: { id: product.id },
      data: { store: resolvedStore },
    });
  }

  const existingItem = await prisma.shoppingItem.findFirst({
    where: {
      householdId: session.householdId,
      productId: product.id,
      isChecked: false,
      quantityUnit: buyUnit,
    },
  });

  if (existingItem) {
    const item = await prisma.shoppingItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + qty,
        quantityUnit: buyUnit,
        unitPrice: existingItem.unitPrice ?? lineUnitPrice,
        store: resolvedStore ?? existingItem.store,
      },
      include: shoppingInclude,
    });

    await logActivity(
      session.householdId,
      actorName,
      "הוספה לרשימת קניות",
      `כמות: ${item.quantity}`,
      item.name
    );

    return Response.json(toShoppingItemResponse(item));
  }

  const item = await prisma.shoppingItem.create({
    data: {
      name: product.name,
      quantity: qty,
      quantityUnit: buyUnit,
      unitPrice: lineUnitPrice,
      store: resolvedStore ?? product.store,
      productId: product.id,
      householdId: session.householdId,
      addedBy: actorName,
    },
    include: shoppingInclude,
  });

  await logActivity(
    session.householdId,
    actorName,
    "הוספה לרשימת קניות",
    `כמות: ${item.quantity}`,
    item.name
  );

  return Response.json(toShoppingItemResponse(item), { status: 201 });
}
