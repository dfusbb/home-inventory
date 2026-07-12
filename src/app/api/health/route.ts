import { prisma } from "@/lib/prisma";

export async function GET() {
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

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    checks.error = error instanceof Error ? error.message : "Database connection failed";
  }

  const ok =
    checks.databaseUrl &&
    checks.databaseProtocolOk &&
    checks.jwtSecret &&
    checks.database;

  return Response.json(
    {
      ok,
      checks: {
        databaseUrl: checks.databaseUrl,
        databaseProtocolOk: checks.databaseProtocolOk,
        jwtSecret: checks.jwtSecret,
        database: checks.database,
      },
      error: checks.error,
    },
    { status: ok ? 200 : 503 }
  );
}
