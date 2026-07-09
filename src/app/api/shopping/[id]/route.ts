import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireVerifiedActor } from "@/lib/actor";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const { actorName, session } = result;
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.shoppingItem.findFirst({
    where: { id, householdId: session.householdId },
  });

  if (!existing) {
    return Response.json({ error: "פריט לא נמצא" }, { status: 404 });
  }

  const item = await prisma.shoppingItem.update({
    where: { id },
    data: {
      isChecked: body.isChecked !== undefined ? Boolean(body.isChecked) : undefined,
      quantity: body.quantity !== undefined ? Math.max(1, Number(body.quantity)) : undefined,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          unitPrice: true,
          category: true,
        },
      },
    },
  });

  if (body.isChecked === true) {
    await logActivity(
      session.householdId,
      actorName,
      "סימון כנרכש",
      undefined,
      item.name
    );
  }

  return Response.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const { actorName, session } = result;
  const { id } = await params;

  const existing = await prisma.shoppingItem.findFirst({
    where: { id, householdId: session.householdId },
  });

  if (!existing) {
    return Response.json({ error: "פריט לא נמצא" }, { status: 404 });
  }

  await prisma.shoppingItem.delete({ where: { id } });

  await logActivity(
    session.householdId,
    actorName,
    "הסרה מרשימת קניות",
    undefined,
    existing.name
  );

  return Response.json({ success: true });
}
