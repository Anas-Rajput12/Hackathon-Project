import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, canManageUsers } from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";
import { parsePagination, paginatedResponse } from "@/lib/api/pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!canManageUsers(user)) {
      throw new ApiError(403, "FORBIDDEN", "Only admins can manage users.");
    }

    const pagination = parsePagination(request);
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const q = url.searchParams.get("q");

    const where = {
      ...(role ? { role: role as never } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { incidents: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return apiSuccess(paginatedResponse(data, total, pagination, request));
  } catch (e) {
    return apiError(e);
  }
}
