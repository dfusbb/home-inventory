import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { ensureAdmin } from "@/lib/ensure-admin";
import { validateServerEnv } from "@/lib/server-env";

export async function POST(request: Request) {
  const envCheck = validateServerEnv();
  if (!envCheck.ok) {
    return Response.json({ error: envCheck.error }, { status: 500 });
  }

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

    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("Can't reach database") ||
      message.includes("Connection") ||
      message.includes("P1001") ||
      message.includes("P1017")
    ) {
      return Response.json(
        {
          error:
            "לא ניתן להתחבר למסד הנתונים. בדקו ש-Neon פעיל וש-DATABASE_URL נכון ב-Netlify",
        },
        { status: 500 }
      );
    }

    return Response.json({ error: "שגיאה בהתחברות" }, { status: 500 });
  }
}
