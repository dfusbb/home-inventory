import { prisma } from "@/lib/prisma";
import { setActor, setActorName } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";

export async function POST(request: Request) {
  const result = await requireAuth();
  if ("error" in result) return result.error;

  const body = await request.json();
  const { memberId, name } = body;

  if (result.session.isAdmin) {
    if (!name?.trim()) {
      return Response.json({ error: "יש להזין שם" }, { status: 400 });
    }
    await setActorName(name.trim());
    return Response.json({ success: true, actorName: name.trim() });
  }

  if (!memberId) {
    return Response.json({ error: "יש לבחור בן משפחה רשום" }, { status: 400 });
  }

  const member = await prisma.familyMember.findFirst({
    where: {
      id: memberId,
      householdId: result.session.householdId,
    },
  });

  if (!member) {
    return Response.json(
      { error: "בן משפחה לא רשום – אין גישה לממשק" },
      { status: 403 }
    );
  }

  await setActor(member.id, member.name);

  return Response.json({
    success: true,
    actorName: member.name,
    isHead: member.isHead,
  });
}
