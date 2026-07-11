import { prisma } from "@/lib/prisma";

function normalizeStoreName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export async function getHouseholdStoreNames(householdId: string): Promise<string[]> {
  const stores = await prisma.productStore.findMany({
    where: { householdId },
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });
  return stores.map((s) => s.name);
}

export async function isValidHouseholdStore(
  householdId: string,
  store: string
): Promise<boolean> {
  if (!store?.trim()) return true;
  const stores = await getHouseholdStoreNames(householdId);
  return stores.includes(store);
}

export async function addHouseholdStore(
  householdId: string,
  rawName: string
): Promise<{ stores: string[] } | { error: string; status: number }> {
  const name = normalizeStoreName(rawName);
  if (!name) {
    return { error: "יש להזין שם חנות", status: 400 };
  }

  const existing = await prisma.productStore.findUnique({
    where: { householdId_name: { householdId, name } },
  });

  if (existing) {
    return { error: "חנות זו כבר קיימת", status: 409 };
  }

  await prisma.productStore.create({
    data: { name, householdId },
  });

  const stores = await getHouseholdStoreNames(householdId);
  return { stores };
}
