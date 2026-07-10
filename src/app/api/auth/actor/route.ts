import { prisma } from "@/lib/prisma";
import { setActor, setActorName } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";
import { normalizeActorName } from "@/lib/actor";

export async function POST(request: Request) {
  const result = await requireAuth();
  if ("error" in result) return result.error;

  const body = await request.json();
  const { name } = body;

  if (result.session.isAdmin) {
    if (!name?.trim()) {
      return Response.json({ error: "יש להזין שם" }, { status: 400 });
    }
    await setActorName(name.trim());
    return Response.json({ success: true, actorName: name.trim() });
  }

  if (!name?.trim()) {
    return Response.json({ error: "יש להזין שם" }, { status: 400 });
  }

  const normalized = normalizeActorName(name);
  const members = await prisma.familyMember.findMany({
    where: { householdId: result.session.householdId },
  });

  const member = members.find(
    (m) => normalizeActorName(m.name) === normalized
  );

  if (!member) {
    return Response.json(
      { error: "השם לא רשום – אין גישה. פנו לראש המשפחה." },
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
