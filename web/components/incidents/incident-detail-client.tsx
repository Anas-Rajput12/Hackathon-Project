"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SeverityBadge, StatusBadge } from "@/components/shared/badges";
import { SEVERITY_CONFIG, STATUS_CONFIG } from "@/lib/constants";
import { Loader2, Trash2, Pencil } from "lucide-react";
import type { Severity, IncidentStatus } from "@/types";

type Props = {
  incident: {
    id: string;
    title: string;
    severity: Severity;
    status: IncidentStatus;
  };
  canEdit: boolean;
  allowedStatuses: IncidentStatus[];
  isAdminOverride?: boolean;
};

export function IncidentDetailClient({ incident, canEdit, allowedStatuses, isAdminOverride }: Props) {
  const router = useRouter();
  const [severity, setSeverity] = useState<Severity>(incident.severity);
  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = severity !== incident.severity || status !== incident.status;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity, status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Failed to update");
      toast.success("Incident updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const destroy = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Failed to delete");
      toast.success("Incident deleted");
      router.push("/incidents");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-xl sm:text-2xl leading-tight">{incident.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <SeverityBadge severity={severity} />
              <StatusBadge status={status} />
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete this incident?</DialogTitle>
                    <DialogDescription>
                      This will permanently remove the incident and all associated evidence and
                      alerts. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={destroy} disabled={deleting}>
                      {deleting ? "Deleting..." : "Yes, delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardHeader>
      {canEdit && (
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-3 border-t">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Severity</label>
              <Select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="w-full"
              >
                {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">
                Status {isAdminOverride && <span className="text-[10px] text-primary">(override enabled)</span>}
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as IncidentStatus)}
                className="w-full"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                  const enabled = k === incident.status || allowedStatuses.includes(k as IncidentStatus);
                  return (
                    <option key={k} value={k} disabled={!enabled}>
                      {v.label} {!enabled ? "(locked)" : ""}
                    </option>
                  );
                })}
              </Select>
            </div>
            <Button onClick={save} disabled={!dirty || saving} className="gap-1 sm:w-auto w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" /> Save changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
