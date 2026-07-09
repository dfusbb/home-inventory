import { prisma } from "@/lib/prisma";
import {
  buildReportSummary,
  resolveReportRange,
  type ReportPeriod,
} from "@/lib/activity";
import { requireVerifiedActor } from "@/lib/actor";

export async function GET(request: Request) {
  const result = await requireVerifiedActor();
  if ("error" in result) return result.error;

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") || "week") as ReportPeriod;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const range = resolveReportRange(period, from, to);
  if ("error" in range) {
    return Response.json({ error: range.error }, { status: 400 });
  }

  const logs = await prisma.activityLog.findMany({
    where: {
      householdId: result.session.householdId,
      createdAt: { gte: range.start, lte: range.end },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    logs,
    summary: buildReportSummary(logs),
    period,
    startDate: range.start,
    endDate: range.end,
  });
}
