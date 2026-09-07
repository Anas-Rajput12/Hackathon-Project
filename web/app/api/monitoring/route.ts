import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { auditWaterBodyCreated } from "@/lib/services/audit";
import { isCopernicusConfigured } from "@/lib/services/satellite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createMonitoringSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    type: z.enum(["RIVER", "LAKE", "RESERVOIR", "GROUNDWATER", "COASTAL"]),
    description: z.string().trim().max(2000).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    bboxNorth: z.number().min(-90).max(90),
    bboxSouth: z.number().min(-90).max(90),
    bboxEast: z.number().min(-180).max(180),
    bboxWest: z.number().min(-180).max(180),
    thresholdWatch: z.number().min(0).max(100).default(10),
    thresholdHigh: z.number().min(0).max(100).default(20),
    thresholdCritical: z.number().min(0).max(100).default(35),
  })
  .superRefine((value, ctx) => {
    if (value.bboxNorth <= value.bboxSouth) {
      ctx.addIssue({
        code: "custom",
        path: ["bboxNorth"],
        message: "North bound must be greater than south bound.",
      });
    }
    if (value.bboxEast <= value.bboxWest) {
      ctx.addIssue({
        code: "custom",
        path: ["bboxEast"],
        message: "East bound must be greater than west bound.",
      });
    }
    if (
      value.thresholdWatch >= value.thresholdHigh ||
      value.thresholdHigh >= value.thresholdCritical
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["thresholdWatch"],
        message: "Risk thresholds must increase from Watch to High to Critical.",
      });
    }
  });

export async function GET() {
  try {
    const user = await requireAuth();
    requireRole(user, ["AUTHORITY", "ADMIN"]);

    const monitors = await prisma.satelliteMonitoring.findMany({
      include: {
        waterBody: { select: { id: true, name: true, type: true } },
        scans: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            riskLevel: true,
            changePercent: true,
            isSimulation: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const data = monitors.map((m) => ({
      id: m.id,
      waterBody: m.waterBody,
      waterBodyId: m.waterBodyId,
      latitude: m.latitude,
      longitude: m.longitude,
      bboxNorth: m.bboxNorth,
      bboxSouth: m.bboxSouth,
      bboxEast: m.bboxEast,
      bboxWest: m.bboxWest,
      status: m.status,
      thresholdWatch: m.thresholdWatch,
      thresholdHigh: m.thresholdHigh,
      thresholdCritical: m.thresholdCritical,
      lastCheckedAt: m.lastCheckedAt,
      latestObservationDate: m.latestObservationDate,
      latestWaterAreaKm2: m.latestWaterAreaKm2,
      latestChangePercent: m.latestChangePercent,
      latestRiskLevel: m.latestRiskLevel,
      previousObservationDate: m.previousObservationDate,
      previousWaterAreaKm2: m.previousWaterAreaKm2,
      latestScan: m.scans[0] ?? null,
      createdAt: m.createdAt,
    }));

    return apiSuccess({
      data,
      satelliteConfigured: isCopernicusConfigured(),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, ["AUTHORITY", "ADMIN"]);

    const input = createMonitoringSchema.parse(await request.json());
    const monitoring = await prisma.$transaction(async (tx) => {
      const waterBody = await tx.waterBody.create({
        data: {
          name: input.name,
          type: input.type,
          description: input.description || null,
          coordinates: { lat: input.latitude, lng: input.longitude },
        },
      });

      return tx.satelliteMonitoring.create({
        data: {
          waterBodyId: waterBody.id,
          latitude: input.latitude,
          longitude: input.longitude,
          bboxNorth: input.bboxNorth,
          bboxSouth: input.bboxSouth,
          bboxEast: input.bboxEast,
          bboxWest: input.bboxWest,
          thresholdWatch: input.thresholdWatch,
          thresholdHigh: input.thresholdHigh,
          thresholdCritical: input.thresholdCritical,
        },
        include: {
          waterBody: { select: { id: true, name: true, type: true } },
        },
      });
    });

    await auditWaterBodyCreated(user, monitoring.waterBodyId, {
      name: monitoring.waterBody.name,
      type: monitoring.waterBody.type,
      source: "monitoring_setup",
    });

    return apiSuccess({ data: monitoring }, 201);
  } catch (e) {
    return apiError(e);
  }
}
