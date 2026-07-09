import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export async function getHouseholdCategoryNames(householdId: string): Promise<string[]> {
  const custom = await prisma.productCategory.findMany({
    where: { householdId },
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });

  const merged: string[] = [...DEFAULT_CATEGORIES];
  for (const { name } of custom) {
    if (!merged.includes(name)) merged.push(name);
  }
  return merged;
}

export async function isValidHouseholdCategory(
  householdId: string,
  category: string
): Promise<boolean> {
  const categories = await getHouseholdCategoryNames(householdId);
  return categories.includes(category);
}

export async function addHouseholdCategory(
  householdId: string,
  rawName: string
): Promise<{ categories: string[] } | { error: string; status: number }> {
  const name = normalizeCategoryName(rawName);
  if (!name) {
    return { error: "יש להזין שם קטגוריה", status: 400 };
  }

  if ((DEFAULT_CATEGORIES as readonly string[]).includes(name)) {
    return { error: "קטגוריה זו כבר קיימת ברשימה", status: 409 };
  }

  const existing = await prisma.productCategory.findUnique({
    where: { householdId_name: { householdId, name } },
  });

  if (existing) {
    return { error: "קטגוריה זו כבר קיימת", status: 409 };
  }

  await prisma.productCategory.create({
    data: { name, householdId },
  });

  const categories = await getHouseholdCategoryNames(householdId);
  return { categories };
}
