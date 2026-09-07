"use client";

import { cn } from "@/lib/utils";
import { SEVERITY_CONFIG, STATUS_CONFIG } from "@/lib/constants";
import type { Severity, IncidentStatus } from "@/types";

export { formatRelativeTime, formatDateTime } from "@/lib/format-date";

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        cfg.color,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: IncidentStatus; className?: string }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        cfg.color,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}

