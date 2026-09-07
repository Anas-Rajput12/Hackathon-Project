import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, assertCanViewIncident } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { triggerIncidentAnalysis, type AnalyzeResponse } from "@/lib/services/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const analyzeSchema = z.object({
  incidentId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = analyzeSchema.parse(body);

    await assertCanViewIncident(user, parsed.incidentId);

    const result: AnalyzeResponse = await triggerIncidentAnalysis(parsed.incidentId);

    // The AI service owns the background pipeline and persists its rows as each
    // agent completes. Do not overwrite those rows with the initial RUNNING
    // response, which intentionally contains no completed output yet.
    if (result.pipeline.length > 0 || result.final !== null) {
      await prisma.$transaction([
        prisma.agentAnalysis.deleteMany({ where: { incidentId: parsed.incidentId } }),
        ...result.pipeline.map((agent) =>
          prisma.agentAnalysis.create({
            data: {
              agentName: agent.agent,
              status: agent.status,
              input: { incidentId: parsed.incidentId },
              output: agent.output as Prisma.InputJsonValue,
              confidence: agent.confidence ?? null,
              incidentId: parsed.incidentId,
            },
          })
        ),
        ...(result.final
          ? [
              prisma.agentAnalysis.create({
                data: {
                  agentName: "final",
                  status: result.status,
                  input: { incidentId: parsed.incidentId },
                  output: result.final as Prisma.InputJsonValue,
                  confidence: null,
                  incidentId: parsed.incidentId,
                },
              }),
            ]
          : []),
      ]);
    }

    return apiSuccess({ data: result });
  } catch (e) {
    return apiError(e);
  }
}
