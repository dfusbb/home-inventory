import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "session";
const ACTOR_COOKIE = "actor_name";
const ACTOR_MEMBER_COOKIE = "actor_member_id";

export interface SessionPayload {
  householdId: string;
  familyName: string;
  isAdmin: boolean;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      householdId: payload.householdId as string,
      familyName: payload.familyName as string,
      isAdmin: payload.isAdmin as boolean,
    };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(ACTOR_COOKIE);
  cookieStore.delete(ACTOR_MEMBER_COOKIE);
}

export async function setActor(memberId: string, name: string) {
  const cookieStore = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24,
    path: "/",
  };
  cookieStore.set(ACTOR_COOKIE, name, opts);
  cookieStore.set(ACTOR_MEMBER_COOKIE, memberId, opts);
}

export async function clearActor() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTOR_COOKIE);
  cookieStore.delete(ACTOR_MEMBER_COOKIE);
}

export async function setActorName(name: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTOR_COOKIE, name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

export async function getActorName(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTOR_COOKIE)?.value ?? null;
}

export async function getActorMemberId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTOR_MEMBER_COOKIE)?.value ?? null;
}
