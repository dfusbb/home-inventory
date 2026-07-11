import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "quantityUnit" TEXT NOT NULL DEFAULT 'unit'`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "hasImage" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "ShoppingItem" ADD COLUMN IF NOT EXISTS "quantityUnit" TEXT NOT NULL DEFAULT 'unit'`,
  `ALTER TABLE "Product" ALTER COLUMN "quantity" TYPE double precision USING "quantity"::double precision`,
  `ALTER TABLE "ShoppingItem" ALTER COLUMN "quantity" TYPE double precision USING "quantity"::double precision`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packagePrice" DOUBLE PRECISION`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packageWeight" DOUBLE PRECISION`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "unitCount" DOUBLE PRECISION`,
];

try {
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("Applied:", sql);
    } catch (error) {
      console.warn(
        "Skipped schema statement:",
        error instanceof Error ? error.message : error
      );
    }
  }
} finally {
  await prisma.$disconnect();
}
