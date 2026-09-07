import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, canAssignInspector } from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";
import { revalidatePath } from "next/cache";
import { auditInspectorAssigned } from "@/lib/services/audit";
import { createAlertForUser } from "@/lib/services/alerts";

const assignmentSchema = z.object({
  // Better Auth user IDs are not guaranteed to use Prisma's CUID format.
  inspectorId: z.string().trim().min(1).max(128),
  notes: z.string().max(2000).optional(),
});

type Params = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();

    if (!canAssignInspector(user)) {
      throw new ApiError(403, "FORBIDDEN", "Only authority or admin users can assign inspectors.");
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = assignmentSchema.parse(body);

    const [incident, inspector] = await Promise.all([
      prisma.incident.findUnique({
        where: { id },
        include: { assignment: { select: { inspectorId: true } } },
      }),
      prisma.user.findUnique({ where: { id: parsed.inspectorId } }),
    ]);

    if (!incident) throw new ApiError(404, "NOT_FOUND", "Incident not found");
    if (!inspector) throw new ApiError(404, "NOT_FOUND", "Inspector not found");
    if (inspector.role !== "INSPECTOR") {
      throw new ApiError(400, "VALIDATION_ERROR", "Selected user is not an inspector.");
    }

    const previousInspectorId = incident.assignment?.inspectorId ?? null;

    await prisma.assignment.upsert({
      where: { incidentId: id },
      create: {
        incidentId: id,
        inspectorId: parsed.inspectorId,
        assignedById: user.id,
        notes: parsed.notes ?? null,
      },
      update: {
        inspectorId: parsed.inspectorId,
        assignedById: user.id,
        notes: parsed.notes ?? null,
        assignedAt: new Date(),
      },
    });

    await Promise.all([
      auditInspectorAssigned(user, id, parsed.inspectorId, previousInspectorId),
      createAlertForUser({
        userId: parsed.inspectorId,
        type: "NEW_INCIDENT",
        title: `Assigned: ${incident.title}`,
        message: `You have been assigned to investigate "${incident.title}".`,
        incidentId: id,
      }),
    ]);

    revalidatePath("/incidents");
    revalidatePath(`/incidents/${id}`);
    revalidatePath("/dashboard/authority");

    const updated = await prisma.assignment.findUnique({
      where: { incidentId: id },
      include: {
        inspector: { select: { id: true, name: true, image: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    });

    return apiSuccess({ data: updated });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();

    if (!canAssignInspector(user)) {
      throw new ApiError(403, "FORBIDDEN", "Only authority or admin users can remove assignments.");
    }

    const { id } = await params;

    const existing = await prisma.assignment.findUnique({ where: { incidentId: id } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Assignment not found");

    await prisma.assignment.delete({ where: { incidentId: id } });

    await auditInspectorAssigned(user, id, "", existing.inspectorId);

    revalidatePath("/incidents");
    revalidatePath(`/incidents/${id}`);
    revalidatePath("/dashboard/authority");

    return apiSuccess({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
