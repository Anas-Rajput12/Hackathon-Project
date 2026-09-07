import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";
import { parsePagination, paginatedResponse } from "@/lib/api/pagination";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const pagination = parsePagination(request);
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";

    const where = {
      userId: user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
        include: { incident: { select: { id: true, title: true, severity: true, status: true } } },
      }),
      prisma.alert.count({ where }),
    ]);

    return apiSuccess(paginatedResponse(data, total, pagination, request));
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = (await request.json()) as { ids?: string[]; all?: boolean };

    if (body.all) {
      await prisma.alert.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      await prisma.alert.updateMany({
        where: { id: { in: body.ids }, userId: user.id },
        data: { isRead: true },
      });
    } else {
      throw new ApiError(400, "VALIDATION_ERROR", "Provide ids[] or all=true");
    }

    revalidatePath("/alerts");
    revalidatePath("/dashboard");
    return apiSuccess({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
