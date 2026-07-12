import { prisma } from "@/lib/prisma";
import { validateServerEnv } from "@/lib/server-env";

export async function GET() {
  const envCheck = validateServerEnv();
  const checks = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    databaseProtocolOk:
      process.env.DATABASE_URL?.startsWith("postgresql://") ||
      process.env.DATABASE_URL?.startsWith("postgres://") ||
      false,
    jwtSecret: Boolean(process.env.JWT_SECRET),
    database: false as boolean,
    error: null as string | null,
  };

  if (!envCheck.ok) {
    return Response.json(
      {
        ok: false,
        checks,
        error: envCheck.error,
      },
      { status: 503 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    checks.error = error instanceof Error ? error.message : "Database connection failed";
  }

  const ok = checks.database;

  return Response.json(
    {
      ok,
      checks,
      error: checks.error,
    },
    { status: ok ? 200 : 503 }
  );
}
