import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, canViewAnalytics } from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!canViewAnalytics(user)) {
      throw new ApiError(403, "FORBIDDEN", "You do not have access to analytics.");
    }

    const url = new URL(request.url);
    const severity = url.searchParams.get("severity");
    const status = url.searchParams.get("status");
    const pollutionType = url.searchParams.get("pollutionType");
    const waterBodyId = url.searchParams.get("waterBodyId");

    const where = {
      ...(severity ? { severity: severity as never } : {}),
      ...(status ? { status: status as never } : {}),
      ...(pollutionType ? { pollutionType } : {}),
      ...(waterBodyId ? { waterBodyId } : {}),
    };

    const incidents = await prisma.incident.findMany({
      where,
      select: {
        id: true,
        title: true,
        latitude: true,
        longitude: true,
        severity: true,
        status: true,
        pollutionType: true,
        reportedAt: true,
        waterBody: { select: { id: true, name: true } },
      },
      orderBy: { severity: "asc" },
    });

    const waterBodies = await prisma.waterBody.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        _count: { select: { incidents: true } },
      },
      orderBy: { incidents: { _count: "desc" } },
    });

    return apiSuccess({
      data: {
        points: incidents.map((i) => ({
          id: i.id,
          title: i.title,
          latitude: i.latitude,
          longitude: i.longitude,
          severity: i.severity,
          status: i.status,
          pollutionType: i.pollutionType,
          waterBody: i.waterBody?.name ?? null,
          reportedAt: i.reportedAt.toISOString(),
        })),
        waterBodies: waterBodies.map((w) => ({
          id: w.id,
          name: w.name,
          type: w.type,
          incidentCount: w._count.incidents,
        })),
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
