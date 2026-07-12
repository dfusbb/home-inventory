import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { ensureAdmin } from "@/lib/ensure-admin";

export async function POST(request: Request) {
  try {
    await ensureAdmin();

    const { familyName, address, code } = await request.json();

    if (!familyName?.trim() || !address?.trim() || !code?.trim()) {
      return Response.json(
        { error: "יש למלא שם משפחה, כתובת וקוד" },
        { status: 400 }
      );
    }

    const household = await prisma.household.findFirst({
      where: {
        familyName: familyName.trim(),
        address: address.trim(),
      },
    });

    if (!household) {
      return Response.json({ error: "פרטי ההתחברות שגויים" }, { status: 401 });
    }

    const valid = await bcrypt.compare(code.trim(), household.codeHash);
    if (!valid) {
      return Response.json({ error: "פרטי ההתחברות שגויים" }, { status: 401 });
    }

    await createSession({
      householdId: household.id,
      familyName: household.familyName,
      isAdmin: household.isAdmin,
    });

    return Response.json({
      success: true,
      isAdmin: household.isAdmin,
      familyName: household.familyName,
    });
  } catch (error) {
    console.error("Login error:", error);

    if (!process.env.JWT_SECRET) {
      return Response.json(
        { error: "השרת לא מוגדר: חסר JWT_SECRET בענן" },
        { status: 500 }
      );
    }

    if (!process.env.DATABASE_URL) {
      return Response.json(
        { error: "השרת לא מוגדר: חסר DATABASE_URL בענן" },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : "";
    if (message.includes("postgresql://") || message.includes("postgres://")) {
      return Response.json(
        { error: "בעיה בחיבור למסד הנתונים. בדקו את DATABASE_URL ב-Netlify" },
        { status: 500 }
      );
    }

    return Response.json({ error: "שגיאה בהתחברות" }, { status: 500 });
  }
}
