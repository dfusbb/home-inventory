import { prisma } from "@/lib/prisma";
import { getActorMemberId, getActorName } from "@/lib/auth";
import { NextResponse } from "next/server";
import { requireAuth } from "./api-auth";

export async function getVerifiedActor(householdId: string) {
  const memberId = await getActorMemberId();
  const actorName = await getActorName();

  if (!memberId || !actorName) {
    return null;
  }

  const member = await prisma.familyMember.findFirst({
    where: { id: memberId, householdId },
  });

  if (!member || member.name !== actorName) {
    return null;
  }

  return member;
}

export async function requireVerifiedActor() {
  const result = await requireAuth();
  if ("error" in result) return result;

  if (result.session.isAdmin) {
    const actorName = await getActorName();
    if (!actorName) {
      return {
        error: NextResponse.json(
          { error: "יש לבחור שם תחילה" },
          { status: 400 }
        ),
      };
    }
    return { session: result.session, actorName, isHead: false, member: null };
  }

  const member = await getVerifiedActor(result.session.householdId);
  if (!member) {
    return {
      error: NextResponse.json(
        { error: "יש לבחור בן משפחה רשום" },
        { status: 403 }
      ),
    };
  }

  return {
    session: result.session,
    actorName: member.name,
    isHead: member.isHead,
    member,
  };
}
