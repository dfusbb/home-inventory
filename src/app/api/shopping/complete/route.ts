import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireVerifiedActor } from "@/lib/actor";

const shoppingInclude = {
  product: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
      unitPrice: true,
      category: true,
      store: true,
      quantity: true,
    },
  },
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

    await prisma.product.update({
      where: { id: item.productId },
      data: {
        quantity: { increment: item.quantity },
        isMissing: false,
        ...(item.store ? { store: item.store } : {}),
      },
    });

    await prisma.shoppingItem.update({
      where: { id: item.id },
      data: { isChecked: true, inCart: false },
    });

    updatedInventory += 1;
    await logActivity(
      householdId,
      actorName,
      "עדכון מלאי מקנייה",
      `+${item.quantity}`,
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
    prisma.product.findMany({ where: { householdId } }),
  ]);

  return Response.json({
    success: true,
    updatedInventory,
    items,
    products,
    message:
      updatedInventory > 0
        ? `עודכנו ${updatedInventory} פריטים במלאי`
        : "הקנייה הושלמה",
  });
}
