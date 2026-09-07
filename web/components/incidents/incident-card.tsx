import Link from "next/link";
import { MapPin, FileText, AlertTriangle } from "lucide-react";
import { SeverityBadge, StatusBadge } from "@/components/shared/badges";
import { formatRelativeTime } from "@/lib/format-date";
import { WATER_BODY_TYPES } from "@/lib/constants";
import type { Severity, IncidentStatus, WaterBodyType } from "@/types";

export type IncidentListItem = {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  pollutionType: string;
  severity: Severity;
  status: IncidentStatus;
  reportedAt: Date | string;
  location?: string;
  reportedBy: { id: string; name: string };
  waterBody: { id: string; name: string; type: WaterBodyType } | null;
  _count: { evidence: number; alerts: number };
};

export function IncidentCard({ incident }: { incident: IncidentListItem }) {
  const locationLabel =
    incident.location ||
    `${incident.latitude.toFixed(3)}, ${incident.longitude.toFixed(3)}`;

  return (
    <Link
      href={`/incidents/${incident.id}`}
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 hover:bg-muted/50 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="mt-0.5 shrink-0">
          <AlertTriangle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate group-hover:text-primary transition-colors">
            {incident.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{locationLabel}</span>
            </span>
            {incident.waterBody && (
              <span className="truncate max-w-[160px]">
                {WATER_BODY_TYPES[incident.waterBody.type]} · {incident.waterBody.name}
              </span>
            )}
            <span>{incident.pollutionType}</span>
            <span>{formatRelativeTime(incident.reportedAt)}</span>
            {incident._count.evidence > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {incident._count.evidence}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reported by <span className="font-medium text-foreground">{incident.reportedBy.name}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 sm:ml-4">
        <SeverityBadge severity={incident.severity} />
        <StatusBadge status={incident.status} />
      </div>
    </Link>
  );
}

export function IncidentListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="h-5 w-5 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-muted rounded" />
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
