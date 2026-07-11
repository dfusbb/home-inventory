import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireVerifiedActor, headOnlyError } from "@/lib/actor";
import { normalizeProductName } from "@/lib/categories";
import { isValidHouseholdCategory } from "@/lib/categories-server";
import { isValidHouseholdStore } from "@/lib/stores-server";
import { normalizeQuantityUnit } from "@/lib/units";
import { toProductListItem } from "@/lib/product-map";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const { actorName, session, isHead } = result;
  const { id } = await params;
  const body = await request.json();

  if (!isHead) {
    const allowedKeys = ["quantity", "unitCount", "isMissing"];
    const attempted = Object.keys(body).filter((k) => body[k] !== undefined);
    if (attempted.some((k) => !allowedKeys.includes(k))) {
      return Response.json(
        { error: "אין הרשאה לערוך שדות אלה – רק ראש המשפחה" },
        { status: 403 }
      );
    }
  }

  const existing = await prisma.product.findFirst({
    where: { id, householdId: session.householdId },
  });

  if (!existing) {
    return Response.json({ error: "מוצר לא נמצא" }, { status: 404 });
  }

  const data: {
    name?: string;
    quantity?: number;
    unitCount?: number | null;
    imageUrl?: string | null;
    hasImage?: boolean;
    isMissing?: boolean;
    category?: string;
    quantityUnit?: string;
    unitPrice?: number | null;
    packagePrice?: number | null;
    packageWeight?: number | null;
    store?: string | null;
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
  if (body.unitCount !== undefined) {
    const parsed =
      body.unitCount === null || body.unitCount === ""
        ? null
        : Number(body.unitCount);
    data.unitCount =
      parsed === null || Number.isNaN(parsed) ? null : Math.max(0, parsed);
  }
  if (body.imageUrl !== undefined) {
    data.imageUrl = body.imageUrl;
    data.hasImage = Boolean(body.imageUrl);
  }
  if (body.isMissing !== undefined) data.isMissing = Boolean(body.isMissing);
  if (body.category !== undefined) {
    const valid = await isValidHouseholdCategory(session.householdId, body.category);
    if (valid) data.category = body.category;
  }
  if (body.quantityUnit !== undefined && isHead) {
    data.quantityUnit = normalizeQuantityUnit(body.quantityUnit);
  }
  if (body.unitPrice !== undefined) {
    const parsed =
      body.unitPrice === null || body.unitPrice === ""
        ? null
        : Number(body.unitPrice);
    data.unitPrice =
      parsed === null || Number.isNaN(parsed) ? null : Math.max(0, parsed);
  }
  if (body.packagePrice !== undefined) {
    const parsed =
      body.packagePrice === null || body.packagePrice === ""
        ? null
        : Number(body.packagePrice);
    data.packagePrice =
      parsed === null || Number.isNaN(parsed) ? null : Math.max(0, parsed);
  }
  if (body.packageWeight !== undefined) {
    const parsed =
      body.packageWeight === null || body.packageWeight === ""
        ? null
        : Number(body.packageWeight);
    data.packageWeight =
      parsed === null || Number.isNaN(parsed) ? null : Math.max(0, parsed);
  }
  if (body.store !== undefined && isHead) {
    const storeVal = body.store === null || body.store === "" ? null : String(body.store).trim();
    if (storeVal === null || (await isValidHouseholdStore(session.householdId, storeVal))) {
      data.store = storeVal;
    }
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
  if (body.isMissing === false && existing.isMissing) {
    action = "ביטול סימון חסר";
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
          quantityUnit: product.quantityUnit,
          householdId: session.householdId,
          addedBy: actorName,
        },
      });
    }
  } else if (
    body.isMissing === false &&
    existing.isMissing &&
    product.quantity > 0
  ) {
    await prisma.shoppingItem.deleteMany({
      where: {
        householdId: session.householdId,
        productId: product.id,
        isChecked: false,
      },
    });
  }

  return Response.json(toProductListItem(product));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;
  if (!result.isHead) return headOnlyError();

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
