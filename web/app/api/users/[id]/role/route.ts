import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, canChangeUserRole } from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";
import { auditUserRoleChanged } from "@/lib/services/audit";

const roleSchema = z.object({
  role: z.enum(["CITIZEN", "INSPECTOR", "NGO", "AUTHORITY", "ADMIN"]),
});

type Params = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await requireAuth();
    if (!canChangeUserRole(adminUser)) {
      throw new ApiError(403, "FORBIDDEN", "Only admins can change user roles.");
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = roleSchema.parse(body);

    if (id === adminUser.id) {
      throw new ApiError(400, "INVALID_REQUEST", "You cannot change your own role.");
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new ApiError(404, "NOT_FOUND", "User not found");

    if (target.role === parsed.role) {
      return apiSuccess({ data: target });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: parsed.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    await auditUserRoleChanged(adminUser, id, target.role, parsed.role);

    return apiSuccess({ data: updated });
  } catch (e) {
    return apiError(e);
  }
}
