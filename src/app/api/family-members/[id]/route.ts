import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { getVerifiedActor } from "@/lib/actor";
import { logActivity } from "@/lib/activity";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if ("error" in result) return result.error;

  if (result.session.isAdmin) {
    return Response.json({ error: "לא זמין למנהל" }, { status: 403 });
  }

  const actor = await getVerifiedActor(result.session.householdId);
  if (!actor?.isHead) {
    return Response.json(
      { error: "רק ראש המשפחה יכול להסיר בני משפחה" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const member = await prisma.familyMember.findFirst({
    where: { id, householdId: result.session.householdId },
  });

  if (!member) {
    return Response.json({ error: "בן משפחה לא נמצא" }, { status: 404 });
  }

  if (member.isHead) {
    return Response.json(
      { error: "לא ניתן להסיר את ראש המשפחה" },
      { status: 400 }
    );
  }

  await prisma.familyMember.delete({ where: { id } });

  await logActivity(
    result.session.householdId,
    actor.name,
    "הסרת בן משפחה",
    `הוסר: ${member.name}`
  );

  return Response.json({ success: true });
}
