import { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { ApiError, apiError, apiSuccess } from "@/lib/api/errors";
import {
  runSatelliteScan,
  runSimulatedScan,
  SatelliteScanError,
} from "@/lib/services/satellite-scan";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scanSchema = z.object({
  monitoringId: z.string().min(1),
  observationDate: z.string().date().optional(),
  simulate: z.boolean().optional().default(false),
  simulatedDecrease: z.number().min(-100).max(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, ["AUTHORITY", "ADMIN"]);

    const body = await request.json();
    const parsed = scanSchema.parse(body);

    let result;
    if (parsed.simulate) {
      result = await runSimulatedScan(
        parsed.monitoringId,
        parsed.simulatedDecrease ?? -25
      );
    } else {
      result = await runSatelliteScan(
        parsed.monitoringId,
        parsed.observationDate
          ? new Date(`${parsed.observationDate}T23:59:59.999Z`)
          : undefined
      );
    }

    return apiSuccess({ data: result }, 201);
  } catch (error) {
    if (error instanceof SatelliteScanError) {
      return apiError(new ApiError(error.status, error.code, error.message));
    }

    return apiError(error);
  }
}
