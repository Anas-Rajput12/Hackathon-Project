import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { parsePagination, paginatedResponse } from "@/lib/api/pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, ["AUTHORITY", "ADMIN"]);

    const url = new URL(request.url);
    const pagination = parsePagination(request);
    const monitoringId = url.searchParams.get("monitoringId") || undefined;

    const where = {
      ...(monitoringId ? { monitoringId } : {}),
      isSimulation: false,
    };

    const [scans, total] = await Promise.all([
      prisma.satelliteScan.findMany({
        where,
        include: {
          monitoring: {
            include: {
              waterBody: { select: { id: true, name: true, type: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.satelliteScan.count({ where }),
    ]);

    return apiSuccess(paginatedResponse(scans, total, pagination, request));
  } catch (e) {
    return apiError(e);
  }
}
