import { z } from "zod";

const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const aiServiceSecret = process.env.AI_SERVICE_SECRET ?? "";

const agentOutputSchema = z.object({
  agent: z.string(),
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]),
  output: z.record(z.string(), z.unknown()).default({}),
  confidence: z.number().nullable().optional(),
});

const analyzeResponseSchema = z.object({
  incidentId: z.string(),
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]),
  pipeline: z.array(agentOutputSchema),
  final: z.record(z.string(), z.unknown()).nullable().optional(),
});

const statusResponseSchema = z.object({
  incidentId: z.string(),
  overall_status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED", "NOT_FOUND"]),
  pipeline: z.array(agentOutputSchema),
  final: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AgentPipelineOutput = z.infer<typeof agentOutputSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
export type AnalysisStatusResponse = z.infer<typeof statusResponseSchema>;

async function aiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${aiServiceUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-AI-Service-Secret": aiServiceSecret,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`AI service error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function triggerIncidentAnalysis(incidentId: string): Promise<AnalyzeResponse> {
  const data = await aiFetch("/analyze/incident", {
    method: "POST",
    body: JSON.stringify({ incidentId }),
  });
  const result = analyzeResponseSchema.safeParse(data);
  if (!result.success) {
    throw new Error("Invalid AI service response");
  }
  return result.data;
}

export async function getIncidentAnalysisStatus(incidentId: string): Promise<AnalysisStatusResponse> {
  const data = await aiFetch(`/analyze/status/${encodeURIComponent(incidentId)}`);
  const result = statusResponseSchema.safeParse(data);
  if (!result.success) {
    throw new Error("Invalid AI service response");
  }
  return result.data;
}
