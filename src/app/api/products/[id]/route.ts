import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireVerifiedActor } from "@/lib/actor";
import { normalizeProductName } from "@/lib/categories";
import { isValidHouseholdCategory } from "@/lib/categories-server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const { actorName, session } = result;
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.product.findFirst({
    where: { id, householdId: session.householdId },
  });

  if (!existing) {
    return Response.json({ error: "מוצר לא נמצא" }, { status: 404 });
  }

  const data: {
    name?: string;
    quantity?: number;
    imageUrl?: string | null;
    isMissing?: boolean;
    category?: string;
    unitPrice?: number | null;
  } = {};

  if (body.name !== undefined) {
    const trimmedName = body.name.trim();
    const normalized = normalizeProductName(trimmedName);

    const others = await prisma.product.findMany({
      where: { householdId: session.householdId, NOT: { id } },
      select: { name: true },
    });

    if (others.some((p) => normalizeProductName(p.name) === normalized)) {
      return Response.json(
        { error: "מוצר בשם זה כבר קיים במלאי" },
        { status: 409 }
      );
    }

    data.name = trimmedName;
  }

  if (body.quantity !== undefined) data.quantity = Math.max(0, Number(body.quantity));
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
  if (body.isMissing !== undefined) data.isMissing = Boolean(body.isMissing);
  if (body.category !== undefined) {
    const valid = await isValidHouseholdCategory(session.householdId, body.category);
    if (valid) data.category = body.category;
  }
  if (body.unitPrice !== undefined) {
    data.unitPrice =
      body.unitPrice === null || body.unitPrice === ""
        ? null
        : Math.max(0, Number(body.unitPrice));
  }

  const product = await prisma.product.update({
    where: { id },
    data,
  });

  let action = "עדכון מוצר";
  let details = "";

  if (body.quantity !== undefined && body.quantity !== existing.quantity) {
    action = "עדכון כמות";
    details = `מ-${existing.quantity} ל-${product.quantity}`;
  }
  if (body.isMissing === true) {
    action = "סימון כחסר";
    details = `כמות נוכחית: ${product.quantity}`;
  }
  if (body.imageUrl !== undefined && body.imageUrl !== existing.imageUrl) {
    action = "עדכון תמונה";
  }
  if (body.category !== undefined && body.category !== existing.category) {
    action = "עדכון קטגוריה";
    details = `${existing.category} → ${product.category}`;
  }

  await logActivity(
    session.householdId,
    actorName,
    action,
    details,
    product.name
  );

  if (product.isMissing || product.quantity === 0) {
    const existingItem = await prisma.shoppingItem.findFirst({
      where: {
        householdId: session.householdId,
        productId: product.id,
        isChecked: false,
      },
    });

    if (!existingItem) {
      await prisma.shoppingItem.create({
        data: {
          productId: product.id,
          name: product.name,
          quantity: 1,
          householdId: session.householdId,
          addedBy: actorName,
        },
      });
    }
  }

  return Response.json(product);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const { actorName, session } = result;
  const { id } = await params;

  const existing = await prisma.product.findFirst({
    where: { id, householdId: session.householdId },
  });

  if (!existing) {
    return Response.json({ error: "מוצר לא נמצא" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });

  await logActivity(
    session.householdId,
    actorName,
    "מחיקת מוצר",
    undefined,
    existing.name
  );

  return Response.json({ success: true });
}
