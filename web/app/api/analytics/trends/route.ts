import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, canViewAnalytics } from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDateRange(url: URL): { start: Date; end: Date; groupBy: "day" | "week" | "month" } {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");
  const groupBy = url.searchParams.get("groupBy") as "day" | "week" | "month" | null;

  return {
    start: startParam ? new Date(startParam) : defaultStart,
    end: endParam ? new Date(endParam) : now,
    groupBy: groupBy && ["day", "week", "month"].includes(groupBy) ? groupBy : "month",
  };
}

function dateKey(date: Date, groupBy: "day" | "week" | "month"): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (groupBy === "day") return `${year}-${month}-${day}`;
  if (groupBy === "week") {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`;
  }
  return `${year}-${month}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!canViewAnalytics(user)) {
      throw new ApiError(403, "FORBIDDEN", "You do not have access to analytics.");
    }

    const url = new URL(request.url);
    const { start, end, groupBy } = parseDateRange(url);

    const [incidents, resolved] = await Promise.all([
      prisma.incident.findMany({
        where: { reportedAt: { gte: start, lte: end } },
        select: { reportedAt: true, status: true, severity: true },
        orderBy: { reportedAt: "asc" },
      }),
      prisma.incident.findMany({
        where: { resolvedAt: { gte: start, lte: end }, status: "RESOLVED" },
        select: { resolvedAt: true },
        orderBy: { resolvedAt: "asc" },
      }),
    ]);

    const reportedMap = new Map<string, number>();
    const resolvedMap = new Map<string, number>();

    for (const i of incidents) {
      const key = dateKey(i.reportedAt, groupBy);
      reportedMap.set(key, (reportedMap.get(key) ?? 0) + 1);
    }

    for (const r of resolved) {
      const key = dateKey(r.resolvedAt!, groupBy);
      resolvedMap.set(key, (resolvedMap.get(key) ?? 0) + 1);
    }

    const allKeys = Array.from(new Set([...reportedMap.keys(), ...resolvedMap.keys()])).sort();

    return apiSuccess({
      data: {
        groupBy,
        start: start.toISOString(),
        end: end.toISOString(),
        trends: allKeys.map((key) => ({
          period: key,
          reported: reportedMap.get(key) ?? 0,
          resolved: resolvedMap.get(key) ?? 0,
        })),
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
