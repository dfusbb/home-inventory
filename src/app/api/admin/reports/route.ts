import { prisma } from "@/lib/prisma";
import {
  buildReportSummary,
  resolveReportRange,
  type ReportPeriod,
} from "@/lib/activity";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") || "week") as ReportPeriod;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const householdId = searchParams.get("householdId");

  const range = resolveReportRange(period, from, to);
  if ("error" in range) {
    return Response.json({ error: range.error }, { status: 400 });
  }

  const logs = await prisma.activityLog.findMany({
    where: {
      createdAt: { gte: range.start, lte: range.end },
      ...(householdId
        ? { householdId }
        : { household: { isAdmin: false } }),
    },
    include: {
      household: {
        select: { familyName: true, address: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = logs.map((log) => ({
    id: log.id,
    action: log.action,
    details: log.details,
    actorName: log.actorName,
    productName: log.productName,
    createdAt: log.createdAt,
    familyName: log.household.familyName,
    address: log.household.address,
  }));

  return Response.json({
    logs: formatted,
    summary: buildReportSummary(logs),
    period,
    startDate: range.start,
    endDate: range.end,
  });
}
