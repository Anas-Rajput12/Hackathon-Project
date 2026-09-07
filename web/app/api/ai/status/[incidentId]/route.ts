import { requireAuth, assertCanViewIncident } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { getIncidentAnalysisStatus } from "@/lib/services/ai";
import { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ incidentId: string }> }) {
  try {
    const user = await requireAuth();
    const { incidentId } = await params;

    await assertCanViewIncident(user, incidentId);

    // The analysis runs in the AI service, so use it as the source of truth
    // while the background pipeline is still running.
    try {
      const serviceStatus = await getIncidentAnalysisStatus(incidentId);
      const pipeline = serviceStatus.pipeline.map((agent) => ({
        agent: agent.agent,
        status: agent.status,
        output: agent.output ?? {},
        confidence: agent.confidence ?? null,
      }));
      const final = serviceStatus.final ?? null;

      if (
        serviceStatus.overall_status === "RUNNING" ||
        pipeline.length > 0 ||
        final !== null
      ) {
        await prisma.$transaction([
          prisma.agentAnalysis.deleteMany({ where: { incidentId } }),
          ...pipeline.map((agent) =>
            prisma.agentAnalysis.create({
              data: {
                agentName: agent.agent,
                status: agent.status,
                input: { incidentId },
                output: agent.output as Prisma.InputJsonValue,
                confidence: agent.confidence,
                incidentId,
              },
            })
          ),
          ...(final !== null
            ? [
                prisma.agentAnalysis.create({
                  data: {
                    agentName: "final",
                    status: serviceStatus.overall_status === "FAILED" ? "FAILED" : "COMPLETED",
                    input: { incidentId },
                    output: final as Prisma.InputJsonValue,
                    confidence: null,
                    incidentId,
                  },
                }),
              ]
            : []),
        ]);
      }

      if (
        serviceStatus.overall_status === "RUNNING" ||
        pipeline.length > 0 ||
        final !== null
      ) {
        return apiSuccess({
          data: {
            incidentId,
            overallStatus: serviceStatus.overall_status,
            pipeline,
            final,
          },
        });
      }
    } catch (serviceError) {
      console.warn("AI service status unavailable; using persisted analysis", serviceError);
    }

    const analyses = await prisma.agentAnalysis.findMany({
      where: { incidentId },
      orderBy: { runAt: "asc" },
    });

    const finalRow = analyses.find((a) => a.agentName === "final");
    const agentRows = analyses.filter((a) => a.agentName !== "final");

    const statuses = new Set(agentRows.map((a) => a.status));
    let overallStatus: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" = "PENDING";
    if (statuses.has("FAILED")) {
      overallStatus = "FAILED";
    } else if (statuses.has("RUNNING")) {
      overallStatus = "RUNNING";
    } else if (statuses.size > 0 && statuses.has("COMPLETED") && statuses.size === 1) {
      overallStatus = "COMPLETED";
    }

    const pipeline = agentRows.map((a) => ({
      agent: a.agentName,
      status: a.status,
      output: (a.output as Record<string, unknown>) ?? {},
      confidence: a.confidence,
    }));

    const final = finalRow ? (finalRow.output as Record<string, unknown> | null) ?? null : null;

    return apiSuccess({ data: { incidentId, overallStatus, pipeline, final } });
  } catch (e) {
    return apiError(e);
  }
}
