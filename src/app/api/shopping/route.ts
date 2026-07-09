import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireVerifiedActor } from "@/lib/actor";

export async function GET() {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const items = await prisma.shoppingItem.findMany({
    where: { householdId: result.session.householdId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          unitPrice: true,
          category: true,
        },
      },
    },
    orderBy: [{ isChecked: "asc" }, { createdAt: "desc" }],
  });

  return Response.json(items);
}

export async function POST(request: Request) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const { productId, quantity = 1 } = await request.json();

  if (!productId) {
    return Response.json(
      { error: "יש לבחור מוצר מהמלאי" },
      { status: 400 }
    );
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, householdId: result.session.householdId },
  });

  if (!product) {
    return Response.json({ error: "מוצר לא נמצא במלאי" }, { status: 404 });
  }

  const existingItem = await prisma.shoppingItem.findFirst({
    where: {
      householdId: result.session.householdId,
      productId: product.id,
      isChecked: false,
    },
  });

  if (existingItem) {
    return Response.json(
      { error: "המוצר כבר ברשימת הקניות" },
      { status: 409 }
    );
  }

  const item = await prisma.shoppingItem.create({
    data: {
      name: product.name,
      quantity: Math.max(1, Number(quantity) || 1),
      productId: product.id,
      householdId: result.session.householdId,
      addedBy: result.actorName,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          unitPrice: true,
          category: true,
        },
      },
    },
  });

  await logActivity(
    result.session.householdId,
    result.actorName,
    "הוספה לרשימת קניות",
    `כמות: ${item.quantity}`,
    item.name
  );

  return Response.json(item, { status: 201 });
}
