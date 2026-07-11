import { prisma } from "@/lib/prisma";
import { requireVerifiedActor } from "@/lib/actor";
import { sortProductsByCategory } from "@/lib/categories";
import { getHouseholdCategoryNames } from "@/lib/categories-server";
import { getHouseholdStoreNames } from "@/lib/stores-server";
import { productListSelect } from "@/lib/product-select";

const shoppingInclude = {
  product: {
    select: productListSelect,
  },
} as const;

export async function GET() {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const householdId = result.session.householdId;

  const [products, shoppingItems, categories, stores] = await Promise.all([
    prisma.product.findMany({
      where: { householdId },
      select: productListSelect,
    }),
    prisma.shoppingItem.findMany({
      where: { householdId },
      include: shoppingInclude,
      orderBy: [{ isChecked: "asc" }, { createdAt: "desc" }],
    }),
    getHouseholdCategoryNames(householdId),
    getHouseholdStoreNames(householdId),
  ]);

  return Response.json({
    products: sortProductsByCategory(products, categories),
    shoppingItems,
    categories,
    stores,
  });
}
