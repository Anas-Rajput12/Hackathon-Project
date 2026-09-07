import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";
import { revalidatePath } from "next/cache";

type Params = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new ApiError(404, "NOT_FOUND", "Alert not found");
    if (alert.userId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "This alert does not belong to you");
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: { isRead: true },
    });

    revalidatePath("/alerts");
    revalidatePath("/dashboard");

    return apiSuccess({ data: updated });
  } catch (e) {
    return apiError(e);
  }
}
