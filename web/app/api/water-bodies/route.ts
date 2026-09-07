import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { auditWaterBodyCreated } from "@/lib/services/audit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createWaterBodySchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(["RIVER", "LAKE", "RESERVOIR", "GROUNDWATER", "COASTAL"]),
  description: z.string().max(2000).nullable().optional(),
  coordinates: z.unknown().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  waterAreaKm2: z.number().nonnegative().nullable().optional(),
  riskLevel: z.enum(["NORMAL", "WATCH", "HIGH", "CRITICAL"]).nullable().optional(),
  geometry: z.unknown().nullable().optional(),
});

export async function GET() {
  try {
    await requireAuth();
    const waterBodies = await prisma.waterBody.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { incidents: true } } },
    });
    return apiSuccess({ data: waterBodies });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    await requireRole(user, ["AUTHORITY", "ADMIN"]);
    const body = await request.json();
    const parsed = createWaterBodySchema.parse(body);

    const waterBody = await prisma.waterBody.create({
      data: {
        name: parsed.name,
        type: parsed.type,
        description: parsed.description ?? null,
        coordinates:
          parsed.coordinates === undefined || parsed.coordinates === null
            ? Prisma.JsonNull
            : (parsed.coordinates as Prisma.InputJsonValue),
        latitude: parsed.latitude ?? null,
        longitude: parsed.longitude ?? null,
        waterAreaKm2: parsed.waterAreaKm2 ?? null,
        riskLevel: parsed.riskLevel ?? null,
        geometry:
          parsed.geometry === undefined || parsed.geometry === null
            ? Prisma.JsonNull
            : (parsed.geometry as Prisma.InputJsonValue),
      },
    });

    await auditWaterBodyCreated(user, waterBody.id, {
      name: waterBody.name,
      type: waterBody.type,
    });

    return apiSuccess({ data: waterBody }, 201);
  } catch (e) {
    return apiError(e);
  }
}
