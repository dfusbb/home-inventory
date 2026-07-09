import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function ensureAdmin() {
  const familyName = process.env.ADMIN_FAMILY_NAME || "admin";
  const address = process.env.ADMIN_ADDRESS || "admin";
  const code = process.env.ADMIN_CODE || "1234";
  const codeHash = await bcrypt.hash(code, 10);

  const existing = await prisma.household.findFirst({
    where: { isAdmin: true },
  });

  if (existing) {
    await prisma.household.update({
      where: { id: existing.id },
      data: { familyName, address, codeHash },
    });
    return existing.id;
  }

  const admin = await prisma.household.create({
    data: {
      familyName,
      address,
      codeHash,
      isAdmin: true,
    },
  });

  return admin.id;
}
