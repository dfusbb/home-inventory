import { PrismaClient } from "@prisma/client";
import { ensureAdmin } from "../src/lib/ensure-admin";

const prisma = new PrismaClient();

async function main() {
  const id = await ensureAdmin();
  console.log("Admin ready:");
  console.log(`  שם משפחה: ${process.env.ADMIN_FAMILY_NAME || "admin"}`);
  console.log(`  כתובת: ${process.env.ADMIN_ADDRESS || "admin"}`);
  console.log(`  קוד: ${process.env.ADMIN_CODE || "1234"}`);
  console.log(`  id: ${id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
