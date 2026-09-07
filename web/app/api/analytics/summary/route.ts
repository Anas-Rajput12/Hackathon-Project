import { prisma } from "@/lib/db";
import { requireAuth, canViewAnalytics } from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!canViewAnalytics(user)) {
      throw new ApiError(403, "FORBIDDEN", "You do not have access to analytics.");
    }

    const [
      total,
      active,
      critical,
      high,
      verified,
      resolved,
      pendingVerification,
      assigned,
      bySeverity,
      byStatus,
      byPollutionType,
      byWaterBody,
    ] = await Promise.all([
      prisma.incident.count(),
      prisma.incident.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
      prisma.incident.count({ where: { severity: "CRITICAL" } }),
      prisma.incident.count({ where: { severity: "HIGH" } }),
      prisma.incident.count({ where: { status: "VERIFIED" } }),
      prisma.incident.count({ where: { status: "RESOLVED" } }),
      prisma.incident.count({ where: { status: "UNDER_REVIEW" } }),
      prisma.assignment.count(),
      prisma.incident.groupBy({ by: ["severity"], _count: { severity: true } }),
      prisma.incident.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.incident.groupBy({ by: ["pollutionType"], _count: { pollutionType: true } }),
      prisma.incident.groupBy({ by: ["waterBodyId"], _count: { waterBodyId: true } }),
    ]);

    const waterBodies = await prisma.waterBody.findMany({
      where: { id: { in: byWaterBody.map((w) => w.waterBodyId).filter(Boolean) as string[] } },
      select: { id: true, name: true },
    });
    const waterBodyMap = new Map(waterBodies.map((w) => [w.id, w.name]));

    return apiSuccess({
      data: {
        total,
        active,
        critical,
        high,
        verified,
        resolved,
        pendingVerification,
        assigned,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        bySeverity: bySeverity.map((s) => ({ name: s.severity, count: s._count.severity })),
        byStatus: byStatus.map((s) => ({ name: s.status, count: s._count.status })),
        byPollutionType: byPollutionType.map((p) => ({
          name: p.pollutionType,
          count: p._count.pollutionType,
        })),
        byWaterBody: byWaterBody
          .filter((w) => w.waterBodyId)
          .map((w) => ({
            name: waterBodyMap.get(w.waterBodyId!) ?? "Unknown",
            count: w._count.waterBodyId,
          })),
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
