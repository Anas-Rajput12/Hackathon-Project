"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserCheck, Loader2, XCircle } from "lucide-react";

type Inspector = {
  id: string;
  name: string;
};

type Assignment = {
  id: string;
  notes: string | null;
  assignedAt: Date | string;
  inspector: { id: string; name: string };
  assignedBy: { id: string; name: string };
} | null;

export function AssignmentPanel({
  incidentId,
  inspectors,
  assignment,
  canAssign,
}: {
  incidentId: string;
  inspectors: Inspector[];
  assignment: Assignment;
  canAssign: boolean;
}) {
  const router = useRouter();
  const [inspectorId, setInspectorId] = useState(assignment?.inspector.id ?? "");
  const [notes, setNotes] = useState(assignment?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const assign = async () => {
    if (!inspectorId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspectorId, notes: notes || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? "Assignment failed");
      toast.success("Inspector assigned");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/assignment`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? "Failed to remove assignment");
      toast.success("Assignment removed");
      setInspectorId("");
      setNotes("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove assignment");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4" /> Inspector Assignment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignment ? (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{assignment.inspector.name}</p>
                <p className="text-xs text-muted-foreground">
                  Assigned by {assignment.assignedBy.name}
                </p>
              </div>
              {canAssign && (
                <Button variant="ghost" size="sm" onClick={remove} disabled={removing} className="text-destructive">
                  {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                </Button>
              )}
            </div>
            {assignment.notes && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                {assignment.notes}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No inspector assigned.</p>
        )}

        {canAssign && (
          <div className="space-y-3 pt-2 border-t">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Inspector</label>
              <Select value={inspectorId} onChange={(e) => setInspectorId(e.target.value)} className="w-full">
                <option value="">Select inspector...</option>
                {inspectors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Assignment notes..."
                rows={2}
              />
            </div>
            <Button onClick={assign} disabled={!inspectorId || loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign / Reassign"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
