import { getSession, getActorName } from "@/lib/auth";
import { getVerifiedActor } from "@/lib/actor";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ authenticated: false });
  }

  const actorName = await getActorName();

  if (session.isAdmin) {
    return Response.json({
      authenticated: true,
      ...session,
      actorName,
      isHead: false,
      actorValid: !!actorName,
    });
  }

  const member = await getVerifiedActor(session.householdId);

  return Response.json({
    authenticated: true,
    ...session,
    actorName: member?.name ?? null,
    actorMemberId: member?.id ?? null,
    isHead: member?.isHead ?? false,
    actorValid: !!member,
  });
}
