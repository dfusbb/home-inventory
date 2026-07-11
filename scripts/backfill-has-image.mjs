import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const updated = await prisma.$executeRaw`
    UPDATE "Product"
    SET "hasImage" = true
    WHERE "imageUrl" IS NOT NULL
      AND length("imageUrl") > 0
      AND "hasImage" = false
  `;
  console.log(`Backfilled hasImage on ${updated} products`);
} finally {
  await prisma.$disconnect();
}
