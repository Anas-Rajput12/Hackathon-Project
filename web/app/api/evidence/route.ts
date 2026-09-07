import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, canViewIncident } from "@/lib/api/auth";
import { apiError, apiSuccess, ApiError } from "@/lib/api/errors";
import { createEvidenceSchema } from "@/lib/validations/incident";
import { uploadFile, classifyFile } from "@/lib/api/upload";
import { revalidatePath } from "next/cache";
import { auditEvidenceUploaded } from "@/lib/services/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const form = await request.formData();
    const file = form.get("file");
    const incidentId = form.get("incidentId");
    const description = form.get("description");

    if (!(file instanceof File)) {
      throw new ApiError(400, "VALIDATION_ERROR", "file is required");
    }
    if (typeof incidentId !== "string") {
      throw new ApiError(400, "VALIDATION_ERROR", "incidentId is required");
    }

    const parsed = createEvidenceSchema.parse({
      incidentId,
      description: typeof description === "string" && description ? description : undefined,
    });

    const incident = await prisma.incident.findUnique({
      where: { id: parsed.incidentId },
      include: { assignment: { select: { inspectorId: true } } },
    });
    if (!incident) throw new ApiError(404, "NOT_FOUND", "Incident not found");

    if (!canViewIncident(user, incident)) {
      throw new ApiError(403, "FORBIDDEN", "You cannot upload evidence to this incident.");
    }

    classifyFile(file);
    const upload = await uploadFile(file);

    const evidence = await prisma.evidence.create({
      data: {
        fileUrl: upload.url,
        fileType: classifyFile(file).evidenceType,
        description: parsed.description ?? null,
        status: "PENDING",
        metadata: upload.provider === "mock" ? { provider: "mock", publicId: upload.publicId } : { provider: "cloudinary", publicId: upload.publicId },
        incidentId: parsed.incidentId,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, image: true } },
      },
    });

    await auditEvidenceUploaded(user, evidence.id, parsed.incidentId);

    revalidatePath(`/incidents/${parsed.incidentId}`);
    revalidatePath("/dashboard");
    revalidatePath("/evidence");

    return apiSuccess({ data: evidence }, 201);
  } catch (e) {
    return apiError(e);
  }
}
