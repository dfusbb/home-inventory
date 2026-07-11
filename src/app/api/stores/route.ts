import { requireVerifiedActor, headOnlyError } from "@/lib/actor";
import { addHouseholdStore, getHouseholdStoreNames } from "@/lib/stores-server";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const stores = await getHouseholdStoreNames(result.session.householdId);
  return Response.json({ stores });
}

export async function POST(request: Request) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;
  if (!result.isHead) return headOnlyError();

  const { name } = await request.json();
  const outcome = await addHouseholdStore(result.session.householdId, name);

  if ("error" in outcome) {
    return Response.json({ error: outcome.error }, { status: outcome.status });
  }

  await logActivity(
    result.session.householdId,
    result.actorName,
    "הוספת חנות",
    outcome.stores[outcome.stores.length - 1]
  );

  return Response.json({ stores: outcome.stores }, { status: 201 });
}
