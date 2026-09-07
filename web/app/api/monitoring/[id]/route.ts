import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "ERROR"]).optional(),
  thresholdWatch: z.number().min(0).max(100).optional(),
  thresholdHigh: z.number().min(0).max(100).optional(),
  thresholdCritical: z.number().min(0).max(100).optional(),
  bboxNorth: z.number().min(-90).max(90).optional(),
  bboxSouth: z.number().min(-90).max(90).optional(),
  bboxEast: z.number().min(-180).max(180).optional(),
  bboxWest: z.number().min(-180).max(180).optional(),
}).superRefine((value, ctx) => {
  if (value.bboxNorth !== undefined && value.bboxSouth !== undefined && value.bboxNorth <= value.bboxSouth) {
    ctx.addIssue({ code: "custom", path: ["bboxNorth"], message: "North bound must be greater than south bound." });
  }
  if (value.bboxEast !== undefined && value.bboxWest !== undefined && value.bboxEast <= value.bboxWest) {
    ctx.addIssue({ code: "custom", path: ["bboxEast"], message: "East bound must be greater than west bound." });
  }
  if (
    value.thresholdWatch !== undefined &&
    value.thresholdHigh !== undefined &&
    value.thresholdWatch >= value.thresholdHigh
  ) {
    ctx.addIssue({ code: "custom", path: ["thresholdWatch"], message: "Risk thresholds must increase." });
  }
  if (
    value.thresholdHigh !== undefined &&
    value.thresholdCritical !== undefined &&
    value.thresholdHigh >= value.thresholdCritical
  ) {
    ctx.addIssue({ code: "custom", path: ["thresholdHigh"], message: "Risk thresholds must increase." });
  }
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireRole(user, ["AUTHORITY", "ADMIN"]);

    const { id } = await params;
    const monitoring = await prisma.satelliteMonitoring.findUnique({
      where: { id },
      include: {
        waterBody: { select: { id: true, name: true, type: true } },
        scans: {
          where: { isSimulation: false },
          take: 20,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!monitoring) {
      return apiError({ status: 404, code: "NOT_FOUND", message: "Monitoring config not found." });
    }

    return apiSuccess({ data: monitoring });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireRole(user, ["AUTHORITY", "ADMIN"]);

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.parse(body);

    const current = await prisma.satelliteMonitoring.findUnique({ where: { id }, select: {
      bboxNorth: true, bboxSouth: true, bboxEast: true, bboxWest: true,
      thresholdWatch: true, thresholdHigh: true, thresholdCritical: true,
    } });
    if (!current) {
      return apiError({ status: 404, code: "NOT_FOUND", message: "Monitoring config not found." });
    }
    const merged = { ...current, ...parsed };
    if (
      merged.bboxNorth <= merged.bboxSouth ||
      merged.bboxEast <= merged.bboxWest ||
      merged.thresholdWatch >= merged.thresholdHigh ||
      merged.thresholdHigh >= merged.thresholdCritical
    ) {
      return apiError({ status: 400, code: "VALIDATION_ERROR", message: "Invalid bounds or risk thresholds." });
    }
    const monitoring = await prisma.satelliteMonitoring.update({
      where: { id },
      data: parsed,
      include: { waterBody: { select: { id: true, name: true, type: true } } },
    });

    return apiSuccess({ data: monitoring });
  } catch (e) {
    return apiError(e);
  }
}
