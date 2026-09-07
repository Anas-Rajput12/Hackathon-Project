import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireAuth,
  canViewIncident,
  canEditIncident,
  canDeleteIncident,
  validateStatusTransition,
} from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";
import { updateIncidentSchema } from "@/lib/validations/incident";
import { revalidatePath } from "next/cache";
import { createStatusChangeAlert } from "@/lib/services/alerts";
import { auditIncidentUpdated, auditStatusChanged, auditIncidentDeleted } from "@/lib/services/audit";
import type { IncidentStatus } from "@/types";

type Params = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        reportedBy: { select: { id: true, name: true, email: true, role: true, image: true } },
        waterBody: true,
        evidence: {
          orderBy: { uploadedAt: "desc" },
          include: {
            uploadedBy: { select: { id: true, name: true, image: true } },
          },
        },
        agentAnalyses: { orderBy: { runAt: "asc" } },
        alerts: { orderBy: { createdAt: "desc" }, take: 10 },
        assignment: {
          include: {
            inspector: { select: { id: true, name: true, image: true } },
            assignedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!incident) {
      throw new ApiError(404, "NOT_FOUND", "Incident not found");
    }

    if (!canViewIncident(user, incident)) {
      throw new ApiError(403, "FORBIDDEN", "You do not have access to this incident.");
    }

    return apiSuccess({ data: incident });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateIncidentSchema.parse(body);

    const existing = await prisma.incident.findUnique({
      where: { id },
      include: { assignment: { select: { inspectorId: true } } },
    });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Incident not found");

    if (!canEditIncident(user, existing)) {
      throw new ApiError(403, "FORBIDDEN", "You cannot edit this incident.");
    }

    if (parsed.status && parsed.status !== existing.status) {
      const valid = validateStatusTransition(
        existing.status as IncidentStatus,
        parsed.status as IncidentStatus,
        user.role === "ADMIN"
      );
      if (!valid) {
        throw new ApiError(
          400,
          "INVALID_TRANSITION",
          `Cannot transition from ${existing.status} to ${parsed.status}`
        );
      }
    }

    const statusChanged = parsed.status && parsed.status !== existing.status;

    const incident = await prisma.incident.update({
      where: { id },
      data: {
        ...parsed,
        resolvedAt:
          parsed.resolvedAt !== undefined
            ? parsed.resolvedAt
            : parsed.status === "RESOLVED" && existing.status !== "RESOLVED"
              ? new Date()
              : existing.resolvedAt,
      },
      include: {
        reportedBy: { select: { id: true, name: true, email: true, role: true, image: true } },
        waterBody: { select: { id: true, name: true, type: true } },
      },
    });

    const promises: Promise<unknown>[] = [];

    if (statusChanged) {
      promises.push(createStatusChangeAlert(incident, parsed.status!));
      promises.push(
        auditStatusChanged(user, id, existing.status, parsed.status as IncidentStatus)
      );
    }

    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined && (existing as Record<string, unknown>)[key] !== value) {
        changes[key] = value;
      }
    }
    if (Object.keys(changes).length > 0 && !statusChanged) {
      promises.push(auditIncidentUpdated(user, id, changes));
    }

    if (promises.length > 0) await Promise.all(promises);

    revalidatePath("/incidents");
    revalidatePath(`/incidents/${id}`);
    revalidatePath("/dashboard");
    revalidatePath("/map");
    revalidatePath("/dashboard/authority");

    return apiSuccess({ data: incident });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await prisma.incident.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Incident not found");

    if (!canDeleteIncident(user, existing)) {
      throw new ApiError(403, "FORBIDDEN", "You cannot delete this incident.");
    }

    await prisma.incident.delete({ where: { id } });

    await auditIncidentDeleted(user, id);

    revalidatePath("/incidents");
    revalidatePath("/dashboard");
    revalidatePath("/map");
    revalidatePath("/dashboard/authority");

    return apiSuccess({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
