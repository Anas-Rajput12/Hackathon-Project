"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type EvidenceStatus = "PENDING" | "VERIFIED" | "REJECTED";

const statusColors: Record<EvidenceStatus, string> = {
  PENDING: "text-slate-600 bg-slate-50 border-slate-200",
  VERIFIED: "text-green-600 bg-green-50 border-green-200",
  REJECTED: "text-red-600 bg-red-50 border-red-200",
};

export function EvidenceReviewActions({
  evidenceId,
  currentStatus,
}: {
  evidenceId: string;
  currentStatus: EvidenceStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<EvidenceStatus>(currentStatus);
  const [loading, setLoading] = useState(false);

  const review = async (next: EvidenceStatus) => {
    if (next === status) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/evidence/${evidenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? "Review failed");
      setStatus(next);
      toast.success(`Evidence marked ${next.toLowerCase()}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(false);
    }
  };

  if (status !== "PENDING") {
    return (
      <Badge variant="outline" className={statusColors[status]}>
        {status}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
        onClick={() => review("VERIFIED")}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        Verify
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => review("REJECTED")}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
        Reject
      </Button>
    </div>
  );
}
