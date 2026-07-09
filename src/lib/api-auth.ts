import { NextResponse } from "next/server";
import { getSession } from "./auth";

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "לא מחובר" }, { status: 401 }) };
  }
  return { session };
}

export async function requireAdmin() {
  const result = await requireAuth();
  if ("error" in result) return result;
  if (!result.session.isAdmin) {
    return { error: NextResponse.json({ error: "אין הרשאה" }, { status: 403 }) };
  }
  return result;
}
