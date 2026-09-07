import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canViewIncident, requireAuth } from "@/lib/api/auth";
import { ApiError, apiError } from "@/lib/api/errors";
import { getMockUpload } from "@/lib/api/upload";

type Params = { params: Promise<{ slug: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { slug } = await params;
    const entry = getMockUpload(slug.replace(/\.[^.]+$/, ""));
    if (!entry) {
      return new NextResponse("Not found", { status: 404 });
    }

    const evidence = await prisma.evidence.findFirst({
      where: { fileUrl: { endsWith: `/${slug}` } },
      include: { incident: { include: { assignment: { select: { inspectorId: true } } } } },
    });
    if (!evidence || !canViewIncident(user, evidence.incident)) {
      throw new ApiError(403, "FORBIDDEN", "You do not have access to this evidence.");
    }

    return new NextResponse(new Uint8Array(entry.buffer), {
      headers: {
        "Content-Type": entry.mime,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
