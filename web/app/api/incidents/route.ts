import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  requireAuth,
  isStaff,
  isAuthorityOrAdmin,
  canViewIncident,
} from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";
import { parsePagination, paginatedResponse } from "@/lib/api/pagination";
import { createIncidentSchema, SEVERITIES, INCIDENT_STATUSES } from "@/lib/validations/incident";
import { revalidatePath } from "next/cache";
import { createIncidentAlerts } from "@/lib/services/alerts";
import { auditIncidentCreated } from "@/lib/services/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const pagination = parsePagination(request);
    const url = new URL(request.url);

    const status = url.searchParams.get("status");
    const severity = url.searchParams.get("severity");
    const pollutionType = url.searchParams.get("pollutionType");
    const waterBodyId = url.searchParams.get("waterBodyId");
    const q = url.searchParams.get("q");
    const mineOnly = url.searchParams.get("mineOnly") === "true";

    if (status && !(INCIDENT_STATUSES as readonly string[]).includes(status)) {
      throw new ApiError(400, "VALIDATION_ERROR", `Invalid status: ${status}`);
    }
    if (severity && !(SEVERITIES as readonly string[]).includes(severity)) {
      throw new ApiError(400, "VALIDATION_ERROR", `Invalid severity: ${severity}`);
    }

    const roleWhere: Prisma.IncidentWhereInput = mineOnly
      ? { reportedById: user.id }
      : !isStaff(user)
        ? { reportedById: user.id }
        : user.role === "INSPECTOR"
          ? {
              OR: [
                { reportedById: user.id },
                { assignment: { inspectorId: user.id } },
              ],
            }
          : {};

    const filterWhere: Prisma.IncidentWhereInput = {
      ...(status ? { status: status as Prisma.EnumIncidentStatusFilter } : {}),
      ...(severity ? { severity: severity as Prisma.EnumSeverityFilter } : {}),
      ...(pollutionType ? { pollutionType } : {}),
      ...(waterBodyId ? { waterBodyId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const where: Prisma.IncidentWhereInput = { AND: [roleWhere, filterWhere] };

    const [data, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        orderBy: { reportedAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          reportedBy: { select: { id: true, name: true, email: true, role: true, image: true } },
          waterBody: { select: { id: true, name: true, type: true } },
          _count: { select: { evidence: true, alerts: true } },
          assignment: {
            include: {
              inspector: { select: { id: true, name: true, image: true } },
            },
          },
        },
      }),
      prisma.incident.count({ where }),
    ]);

    const visible = isAuthorityOrAdmin(user)
      ? data
      : data.filter((incident) => canViewIncident(user, incident));

    return NextResponse.json(paginatedResponse(visible, total, pagination, request));
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = createIncidentSchema.parse({
      ...body,
      waterBodyId: body.waterBodyId === "" ? null : body.waterBodyId ?? null,
      observedAt: body.observedAt || undefined,
    });

    const incident = await prisma.incident.create({
      data: {
        title: parsed.title,
        description: parsed.description,
        pollutionType: parsed.pollutionType,
        severity: parsed.severity,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        waterBodyId: parsed.waterBodyId ?? null,
        reportedById: user.id,
        reportedAt: parsed.observedAt ?? new Date(),
      },
      include: {
        reportedBy: { select: { id: true, name: true, email: true, role: true, image: true } },
        waterBody: { select: { id: true, name: true, type: true } },
      },
    });

    await Promise.all([
      createIncidentAlerts(incident),
      auditIncidentCreated(user, incident.id, {
        title: incident.title,
        severity: incident.severity,
        pollutionType: incident.pollutionType,
      }),
    ]);

    revalidatePath("/incidents");
    revalidatePath("/dashboard");
    revalidatePath("/map");

    return apiSuccess({ data: incident }, 201);
  } catch (e) {
    return apiError(e);
  }
}
