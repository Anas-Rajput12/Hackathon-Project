import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, canViewAuditLogs } from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";
import { parsePagination, paginatedResponse } from "@/lib/api/pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!canViewAuditLogs(user)) {
      throw new ApiError(403, "FORBIDDEN", "Only admins can view audit logs.");
    }

    const pagination = parsePagination(request);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    const where = {
      ...(action ? { action } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return apiSuccess(paginatedResponse(data, total, pagination, request));
  } catch (e) {
    return apiError(e);
  }
}
