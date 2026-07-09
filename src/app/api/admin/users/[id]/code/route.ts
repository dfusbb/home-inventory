import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";
import { getActorName } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { id } = await params;
  const { newCode } = await request.json();

  if (!newCode?.trim()) {
    return Response.json({ error: "יש להזין קוד חדש" }, { status: 400 });
  }

  if (newCode.trim().length < 4) {
    return Response.json(
      { error: "הקוד חייב להכיל לפחות 4 תווים" },
      { status: 400 }
    );
  }

  const household = await prisma.household.findUnique({ where: { id } });
  if (!household) {
    return Response.json({ error: "משתמש לא נמצא" }, { status: 404 });
  }

  const codeHash = await bcrypt.hash(newCode.trim(), 10);

  await prisma.household.update({
    where: { id },
    data: { codeHash },
  });

  const actorName = (await getActorName()) || "מנהל";
  const targetLabel = household.isAdmin
    ? "מנהל המערכת"
    : `משפחת ${household.familyName}`;

  await logActivity(
    result.session.householdId,
    actorName,
    "שינוי קוד כניסה",
    `קוד עודכן עבור: ${targetLabel}`
  );

  return Response.json({ success: true });
}
