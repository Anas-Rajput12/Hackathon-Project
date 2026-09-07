"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { AgentStage } from "@/lib/services/ai-mock";

type ApiStage = {
  agent: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  output: Record<string, unknown>;
  confidence: number | null;
};

type ApiFinal = {
  overall_risk_level?: string;
  overall_confidence?: number;
  summary?: string;
  recommended_next_steps?: string[];
  demo?: boolean;
} | null;

type StatusResponse = {
  data: {
    incidentId: string;
    overallStatus: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "NOT_FOUND";
    pipeline: ApiStage[];
    final: ApiFinal;
  };
};

const STATUS_META: Record<AgentStage["status"], { icon: React.ElementType; className: string }> = {
  PENDING: { icon: Clock, className: "text-slate-500" },
  RUNNING: { icon: Loader2, className: "text-blue-500 animate-spin" },
  COMPLETED: { icon: CheckCircle2, className: "text-green-600" },
  FAILED: { icon: XCircle, className: "text-red-600" },
};

type Props = {
  pipeline: AgentStage[];
  incidentId: string;
  canRun: boolean;
};

function getInitialStatus(stages: AgentStage[]): StatusResponse["data"]["overallStatus"] {
  if (stages.length === 0) return "NOT_FOUND";
  if (stages.some((stage) => stage.status === "RUNNING")) return "RUNNING";
  if (stages.some((stage) => stage.status === "PENDING")) return "PENDING";
  if (stages.every((stage) => stage.status === "FAILED")) return "FAILED";
  return "COMPLETED";
}

export function AiAnalysisPanel({ pipeline: initialPipeline, incidentId, canRun }: Props) {
  const [stages, setStages] = useState<AgentStage[]>(initialPipeline);
  const [final, setFinal] = useState<ApiFinal>(null);
  const [overallStatus, setOverallStatus] = useState<StatusResponse["data"]["overallStatus"]>(() => getInitialStatus(initialPipeline));
  const [loading, setLoading] = useState(false);

  const isTerminal = (status: string) => status === "COMPLETED" || status === "FAILED" || status === "NOT_FOUND";

  const mapApiToStages = useCallback((apiPipeline: ApiStage[]): AgentStage[] => {
    return apiPipeline.map((item) => ({
      name: item.agent,
      label: agentLabel(item.agent),
      description: agentDescription(item.agent),
      status: item.status,
      confidence: item.confidence,
      output: item.output,
    }));
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai/status/${encodeURIComponent(incidentId)}`);
      const body: StatusResponse = await res.json();
      if (!res.ok) {
        throw new Error(body?.data ? "Status request failed" : "Unknown error");
      }
      const data = body.data;
      const hasAnalysisData = data.pipeline.length > 0 || data.final !== null;
      if (hasAnalysisData) {
        setStages(mapApiToStages(data.pipeline));
        setOverallStatus(data.overallStatus);
        setFinal(data.final);
        return data.overallStatus;
      }

      if (stages.length === 0 && data.overallStatus === "RUNNING") {
        setOverallStatus("RUNNING");
      }

      // Do not replace a just-started analysis with a transient empty response.
      return overallStatus;
    } catch (err) {
      console.error("Failed to fetch AI analysis status", err);
      return overallStatus;
    }
  }, [incidentId, mapApiToStages, overallStatus, stages.length]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message ?? "Failed to start AI analysis");
      }
      const result = body.data as {
        status: StatusResponse["data"]["overallStatus"];
        pipeline?: ApiStage[];
        final?: ApiFinal;
      };
      const pipeline = result.pipeline ?? [];
      setStages(mapApiToStages(pipeline));
      setOverallStatus(result.status);
      setFinal(result.final ?? null);
      toast.success("AI analysis started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start analysis");
    } finally {
      setLoading(false);
    }
  };

  const analysisFinished = Boolean(final?.summary);
  const running =
    !analysisFinished &&
    (stages.some((stage) => stage.status === "RUNNING") || overallStatus === "RUNNING");

  useEffect(() => {
    // The final summary is persisted only after the pipeline has stopped.
    // Treat it as terminal even if an older status row still says RUNNING.
    const needsPoll = !isTerminal(overallStatus) && !final?.summary;
    if (!needsPoll) return;

    let cancelled = false;

    const tick = async () => {
      await fetchStatus();
      if (cancelled) return;
    };

    void tick();
    const interval = setInterval(() => {
      void tick();
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stages.length, overallStatus, final?.summary, fetchStatus]);

  const completedStages = stages.filter((s) => s.status === "COMPLETED" && typeof s.confidence === "number");
  const overallConfidence =
    completedStages.length > 0
      ? completedStages.reduce((acc, s) => acc + (s.confidence ?? 0), 0) / completedStages.length
      : 0;

  const isDemo = final?.demo ?? stages.some((s) => s.output?.demo === true);
  const riskLevel = final?.overall_risk_level;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Analysis
          {isDemo && (
            <Badge variant="outline" className="ml-auto text-[10px] border-amber-400 text-amber-600">
              AI analysis
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Powered by the AquaTrace 5-agent pipeline.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {canRun && overallStatus !== "COMPLETED" && !analysisFinished && (
          <Button
            onClick={runAnalysis}
            disabled={loading || running}
            className="w-full gap-1"
            size="sm"
          >
            {loading || running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Run AI Analysis
              </>
            )}
          </Button>
        )}

        {stages.length === 0 && running && (
          <p className="text-xs text-muted-foreground">
            Real AI analysis is running. Waiting for the agent results...
          </p>
        )}

        {stages.length === 0 && !running && (
          <p className="text-xs text-muted-foreground">
            {overallStatus === "FAILED"
              ? "The real AI analysis failed before producing agent results. Check that the AI service and model credentials are running, then run the analysis again."
              : "No AI analysis yet. Select “Run AI Analysis” to start the multi-agent pipeline."}
          </p>
        )}

        {stages.length > 0 && (
          <>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <span className="text-xs text-muted-foreground">Overall Confidence</span>
              <span className="text-sm font-semibold">{Math.round(overallConfidence * 100)}%</span>
            </div>

            {riskLevel && (
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                <span className="text-xs text-muted-foreground">Overall Risk</span>
                <RiskBadge level={riskLevel} />
              </div>
            )}

            <div className="space-y-2">
              {stages.map((stage, idx) => (
                <AgentStageCard key={`${stage.name}-${idx}`} stage={stage} index={idx} />
              ))}
            </div>

          </>
        )}

        {final?.summary && (
          <>
            <Separator />
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium">Summary</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{final.summary}</p>
              {final.recommended_next_steps && final.recommended_next_steps.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Recommended next steps</p>
                  <ul className="list-disc ml-4 space-y-0.5 text-xs text-muted-foreground">
                    {final.recommended_next_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        <Separator />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          This analysis is AI-generated and should be independently verified before scientific,
          regulatory, or enforcement decisions.
        </p>
      </CardContent>
    </Card>
  );
}

function RiskBadge({ level }: { level: string }) {
  const color =
    level === "CRITICAL"
      ? "bg-red-100 text-red-700 border-red-200"
      : level === "HIGH"
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : level === "MEDIUM"
          ? "bg-yellow-100 text-yellow-700 border-yellow-200"
          : "bg-green-100 text-green-700 border-green-200";
  return (
    <Badge variant="outline" className={cn("text-[10px] capitalize", color)}>
      {level.toLowerCase()}
    </Badge>
  );
}

function AgentStageCard({ stage, index }: { stage: AgentStage; index: number }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[stage.status];
  const Icon = meta.icon;

  return (
    <div className="rounded-lg border bg-background">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex flex-col items-center shrink-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
            {index + 1}
          </div>
          {index < 4 && <div className="w-px h-3 bg-border mt-1" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">{stage.label}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              {stage.confidence !== null && stage.status === "COMPLETED" && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {Math.round(stage.confidence * 100)}%
                </span>
              )}
              <Icon className={cn("h-4 w-4", meta.className)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{stage.description}</p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 pl-12">
          <AgentOutput output={stage.output} />
        </div>
      )}
    </div>
  );
}

function AgentOutput({ output }: { output: Record<string, unknown> }) {
  if (!output || Object.keys(output).length === 0) {
    return <p className="text-xs text-muted-foreground">No output available.</p>;
  }

  return (
    <div className="space-y-2 text-xs">
      {Object.entries(output).map(([key, value]) => (
        <div key={key}>
          <span className="font-medium text-muted-foreground capitalize">
            {key.replace(/_/g, " ")}:{" "}
          </span>
          <ValueRenderer value={value} />
        </div>
      ))}
    </div>
  );
}

function ValueRenderer({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") return <span>{value ? "yes" : "no"}</span>;
  if (typeof value === "number") return <span className="tabular-nums">{value}</span>;
  if (typeof value === "string") return <span>{value}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">[]</span>;
    return (
      <ul className="list-disc ml-4 mt-1 space-y-0.5">
        {value.map((v, i) => (
          <li key={i}>
            <ValueRenderer value={v} />
          </li>
        ))}
      </ul>
    );
  }
  return <span className="text-muted-foreground">{JSON.stringify(value)}</span>;
}

function agentLabel(name: string): string {
  const map: Record<string, string> = {
    evidence: "Evidence Agent",
    water_quality: "Water Quality Agent",
    verification: "Verification Agent",
    risk_assessment: "Risk Assessment Agent",
    resolution: "Resolution Agent",
  };
  return map[name] ?? name;
}

function agentDescription(name: string): string {
  const map: Record<string, string> = {
    evidence: "Analyzes uploaded photos, documents, and descriptions for credibility.",
    water_quality: "Estimates water quality parameters and likely contaminants.",
    verification: "Cross-checks evidence for internal consistency.",
    risk_assessment: "Evaluates population and environmental impact risk.",
    resolution: "Recommends next actions and stakeholders.",
  };
  return map[name] ?? "";
}
