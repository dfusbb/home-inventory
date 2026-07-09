import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireVerifiedActor } from "@/lib/actor";

export async function POST(
  request: Request,
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

  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return Response.json({ error: "לא נבחרה תמונה" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${uuidv4()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  const imageUrl = `/uploads/${filename}`;

  const product = await prisma.product.update({
    where: { id },
    data: { imageUrl },
  });

  await logActivity(
    session.householdId,
    actorName,
    "העלאת תמונה",
    undefined,
    product.name
  );

  return Response.json(product);
}
