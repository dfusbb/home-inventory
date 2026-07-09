import { prisma } from "./prisma";

export async function logActivity(
  householdId: string,
  actorName: string,
  action: string,
  details?: string,
  productName?: string
) {
  await prisma.activityLog.create({
    data: {
      householdId,
      actorName,
      action,
      details,
      productName,
    },
  });
}

export type ReportPeriod = "day" | "week" | "month" | "custom";

export function getPeriodStart(period: Exclude<ReportPeriod, "custom">): Date {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case "day":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
  }

  return start;
}

export function parseDateRange(
  from: string,
  to: string
): { start: Date; end: Date } | null {
  if (!from || !to) return null;

  const start = new Date(from);
  const end = new Date(to);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (start > end) return null;

  return { start, end };
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function buildReportSummary(
  logs: { action: string }[]
): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const log of logs) {
    summary[log.action] = (summary[log.action] || 0) + 1;
  }
  return summary;
}

function resolveReportRange(
  period: ReportPeriod,
  from: string | null,
  to: string | null
): { start: Date; end: Date } | { error: string } {
  if (period === "custom") {
    const range = parseDateRange(from || "", to || "");
    if (!range) {
      return { error: "יש לבחור תאריכים תקינים (מ-עד)" };
    }
    return range;
  }

  if (!["day", "week", "month"].includes(period)) {
    return { error: "תקופה לא תקינה" };
  }

  return {
    start: getPeriodStart(period),
    end: new Date(),
  };
}

export { resolveReportRange };
