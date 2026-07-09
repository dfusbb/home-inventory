import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";
import { getActorName } from "@/lib/auth";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const users = await prisma.household.findMany({
    where: { isAdmin: false },
    select: {
      id: true,
      familyName: true,
      address: true,
      createdAt: true,
      members: {
        where: { isHead: true },
        select: { name: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(
    users.map((u) => ({
      id: u.id,
      familyName: u.familyName,
      address: u.address,
      createdAt: u.createdAt,
      headName: u.members[0]?.name ?? null,
    }))
  );
}

export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { familyName, address, code, headName } = await request.json();

  if (!familyName?.trim() || !address?.trim() || !code?.trim() || !headName?.trim()) {
    return Response.json(
      { error: "יש למלא שם משפחה, כתובת, קוד ושם ראש משפחה" },
      { status: 400 }
    );
  }

  const existing = await prisma.household.findFirst({
    where: {
      familyName: familyName.trim(),
      address: address.trim(),
    },
  });

  if (existing) {
    return Response.json(
      { error: "משתמש עם שם משפחה וכתובת זו כבר קיים" },
      { status: 409 }
    );
  }

  const codeHash = await bcrypt.hash(code.trim(), 10);
  const user = await prisma.household.create({
    data: {
      familyName: familyName.trim(),
      address: address.trim(),
      codeHash,
      isAdmin: false,
      members: {
        create: {
          name: headName.trim(),
          isHead: true,
        },
      },
    },
    select: {
      id: true,
      familyName: true,
      address: true,
      createdAt: true,
      members: {
        where: { isHead: true },
        select: { name: true },
        take: 1,
      },
    },
  });

  const actorName = (await getActorName()) || "מנהל";
  await logActivity(
    result.session.householdId,
    actorName,
    "הוספת משתמש",
    `נוסף משתמש: ${user.familyName} - ראש משפחה: ${headName.trim()}`
  );

  return Response.json(
    {
      id: user.id,
      familyName: user.familyName,
      address: user.address,
      createdAt: user.createdAt,
      headName: user.members[0]?.name ?? headName.trim(),
    },
    { status: 201 }
  );
}

export async function DELETE(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "חסר מזהה משתמש" }, { status: 400 });
  }

  const user = await prisma.household.findUnique({ where: { id } });
  if (!user || user.isAdmin) {
    return Response.json({ error: "משתמש לא נמצא" }, { status: 404 });
  }

  await prisma.household.delete({ where: { id } });

  const actorName = (await getActorName()) || "מנהל";
  await logActivity(
    result.session.householdId,
    actorName,
    "מחיקת משתמש",
    `נמחק משתמש: ${user.familyName}`
  );

  return Response.json({ success: true });
}
