import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { getVerifiedActor } from "@/lib/actor";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const result = await requireAuth();
  if ("error" in result) return result.error;

  if (result.session.isAdmin) {
    return Response.json([]);
  }

  const members = await prisma.familyMember.findMany({
    where: { householdId: result.session.householdId },
    select: {
      id: true,
      name: true,
      isHead: true,
      createdAt: true,
    },
    orderBy: [{ isHead: "desc" }, { name: "asc" }],
  });

  return Response.json(members);
}

export async function POST(request: Request) {
  const result = await requireAuth();
  if ("error" in result) return result.error;

  if (result.session.isAdmin) {
    return Response.json({ error: "לא זמין למנהל" }, { status: 403 });
  }

  const actor = await getVerifiedActor(result.session.householdId);
  if (!actor?.isHead) {
    return Response.json(
      { error: "רק ראש המשפחה יכול להוסיף בני משפחה" },
      { status: 403 }
    );
  }

  const { name } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "יש להזין שם" }, { status: 400 });
  }

  const trimmed = name.trim();

  const existing = await prisma.familyMember.findFirst({
    where: {
      householdId: result.session.householdId,
      name: trimmed,
    },
  });

  if (existing) {
    return Response.json(
      { error: "בן משפחה עם שם זה כבר רשום" },
      { status: 409 }
    );
  }

  const member = await prisma.familyMember.create({
    data: {
      name: trimmed,
      householdId: result.session.householdId,
      isHead: false,
    },
    select: {
      id: true,
      name: true,
      isHead: true,
      createdAt: true,
    },
  });

  await logActivity(
    result.session.householdId,
    actor!.name,
    "הוספת בן משפחה",
    `נוסף: ${member.name}`
  );

  return Response.json(member, { status: 201 });
}
