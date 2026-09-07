import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, canReviewEvidence } from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";
import { updateEvidenceSchema } from "@/lib/validations/incident";
import { revalidatePath } from "next/cache";
import { auditEvidenceReviewed } from "@/lib/services/audit";

type IdParams = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: IdParams) {
  try {
    await requireAuth();
    const { id } = await params;
    const evidence = await prisma.evidence.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, name: true, image: true } },
        incident: { select: { id: true, title: true, status: true } },
      },
    });
    if (!evidence) throw new ApiError(404, "NOT_FOUND", "Evidence not found");
    return apiSuccess({ data: evidence });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: NextRequest, { params }: IdParams) {
  try {
    const user = await requireAuth();

    if (!canReviewEvidence(user)) {
      throw new ApiError(403, "FORBIDDEN", "You do not have permission to review evidence.");
    }

    await requireRole(user, ["INSPECTOR", "AUTHORITY", "ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateEvidenceSchema.parse(body);

    const existing = await prisma.evidence.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Evidence not found");

    const evidence = await prisma.evidence.update({
      where: { id },
      data: parsed,
      include: {
        uploadedBy: { select: { id: true, name: true, image: true } },
        incident: { select: { id: true, title: true } },
      },
    });

    if (parsed.status && parsed.status !== existing.status) {
      await auditEvidenceReviewed(
        user,
        id,
        existing.incidentId,
        parsed.status,
        existing.status
      );
    }

    revalidatePath(`/incidents/${existing.incidentId}`);
    revalidatePath("/dashboard");
    revalidatePath("/evidence");

    return apiSuccess({ data: evidence });
  } catch (e) {
    return apiError(e);
  }
}
