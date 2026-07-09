import { clearActor } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";

export async function POST() {
  const result = await requireAuth();
  if ("error" in result) return result.error;

  await clearActor();
  return Response.json({ success: true });
}
