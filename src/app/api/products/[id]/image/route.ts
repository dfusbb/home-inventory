import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireVerifiedActor, headOnlyError } from "@/lib/actor";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export async function POST(
  request: Request,
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

  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return Response.json({ error: "לא נבחרה תמונה" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return Response.json(
      { error: "התמונה גדולה מדי. נסו שוב אחרי חיתוך." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(bytes);
  const mime = file.type?.startsWith("image/") ? file.type : "image/jpeg";
  const imageUrl = `data:${mime};base64,${buffer.toString("base64")}`;

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
