import { requireVerifiedActor, headOnlyError } from "@/lib/actor";
import {
  addHouseholdCategory,
  getHouseholdCategoryNames,
} from "@/lib/categories-server";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const categories = await getHouseholdCategoryNames(result.session.householdId);
  return Response.json({ categories });
}

export async function POST(request: Request) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;
  if (!result.isHead) return headOnlyError();

  const { name } = await request.json();
  const outcome = await addHouseholdCategory(result.session.householdId, name);

  if ("error" in outcome) {
    return Response.json({ error: outcome.error }, { status: outcome.status });
  }

  await logActivity(
    result.session.householdId,
    result.actorName,
    "הוספת קטגוריה",
    outcome.categories[outcome.categories.length - 1]
  );

  return Response.json({ categories: outcome.categories }, { status: 201 });
}
