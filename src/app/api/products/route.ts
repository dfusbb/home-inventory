import { prisma } from "@/lib/prisma";
import { requireVerifiedActor, headOnlyError } from "@/lib/actor";
import {
  guessCategory,
  normalizeProductName,
  sortProductsByCategory,
} from "@/lib/categories";
import {
  getHouseholdCategoryNames,
  isValidHouseholdCategory,
} from "@/lib/categories-server";
import { defaultUnitForCategory, normalizeQuantityUnit } from "@/lib/units";
import { toProductListItem } from "@/lib/product-map";

export async function GET() {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const [products, categoryOrder] = await Promise.all([
    prisma.product.findMany({
      where: { householdId: result.session.householdId },
    }),
    getHouseholdCategoryNames(result.session.householdId),
  ]);

  return Response.json(
    sortProductsByCategory(
      products.map(toProductListItem),
      categoryOrder
    )
  );
}

export async function POST(request: Request) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;
  if (!result.isHead) return headOnlyError();

  const { name, quantity = 0, category, unitPrice, quantityUnit } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "יש להזין שם מוצר" }, { status: 400 });
  }

  const trimmedName = name.trim();
  const normalized = normalizeProductName(trimmedName);

  const existing = await prisma.product.findMany({
    where: { householdId: result.session.householdId },
    select: { name: true },
  });

  if (existing.some((p) => normalizeProductName(p.name) === normalized)) {
    return Response.json(
      { error: "מוצר בשם זה כבר קיים במלאי" },
      { status: 409 }
    );
  }

  let resolvedCategory = guessCategory(trimmedName);
  if (category && (await isValidHouseholdCategory(result.session.householdId, category))) {
    resolvedCategory = category;
  }

  const product = await prisma.product.create({
    data: {
      name: trimmedName,
      quantity: Math.max(0, Number(quantity) || 0),
      category: resolvedCategory,
      quantityUnit: quantityUnit
        ? normalizeQuantityUnit(quantityUnit)
        : defaultUnitForCategory(resolvedCategory),
      unitPrice:
        unitPrice !== undefined && unitPrice !== null && unitPrice !== ""
          ? Math.max(0, Number(unitPrice))
          : null,
      householdId: result.session.householdId,
    },
  });

  const { logActivity } = await import("@/lib/activity");
  await logActivity(
    result.session.householdId,
    result.actorName,
    "הוספת מוצר",
    `כמות: ${product.quantity}, קטגוריה: ${product.category}`,
    product.name
  );

  return Response.json(toProductListItem(product), { status: 201 });
}
