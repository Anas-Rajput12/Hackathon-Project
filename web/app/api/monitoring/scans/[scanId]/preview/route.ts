import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import { fetchObservationPreview } from "@/lib/services/satellite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const user = await requireAuth();
    requireRole(user, ["INSPECTOR", "AUTHORITY", "ADMIN"]);

    const { scanId } = await params;
    const kind = new URL(request.url).searchParams.get("kind") === "ndwi" ? "ndwi" : "rgb";
    const scan = await prisma.satelliteScan.findUnique({
      where: { id: scanId },
      include: { monitoring: true },
    });

    if (!scan || scan.isSimulation || scan.status !== "COMPLETED") {
      return new NextResponse(null, { status: 404 });
    }

    const image = await fetchObservationPreview(
      {
        north: scan.monitoring.bboxNorth,
        south: scan.monitoring.bboxSouth,
        east: scan.monitoring.bboxEast,
        west: scan.monitoring.bboxWest,
      },
      scan.observationDate,
      kind
    );

    const preview = await sharp(Buffer.from(image))
      .trim({ threshold: 12 })
      .resize({
        width: 1536,
        height: 1024,
        fit: "cover",
        position: "centre",
        kernel: sharp.kernel.lanczos3,
      })
      .sharpen({ sigma: 1.5 })
      .png()
      .toBuffer();

    return new NextResponse(preview, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
