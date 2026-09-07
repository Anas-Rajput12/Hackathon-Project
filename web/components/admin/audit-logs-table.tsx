"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/components/shared/badges";

type AuditLogItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string } | null;
};

type PaginatedResponse = {
  data: AuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    next: string | null;
    prev: string | null;
  };
};

const actions = [
  "INCIDENT_CREATED",
  "INCIDENT_UPDATED",
  "INCIDENT_DELETED",
  "STATUS_CHANGED",
  "EVIDENCE_UPLOADED",
  "EVIDENCE_REVIEWED",
  "INSPECTOR_ASSIGNED",
  "INSPECTOR_REASSIGNED",
  "USER_ROLE_CHANGED",
  "WATER_BODY_CREATED",
];

export function AuditLogsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const actionFilter = searchParams.get("action") ?? "";

  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const buildUrl = useCallback(
    (nextPage: number, nextAction: string) => {
      const params = new URLSearchParams();
      if (nextPage > 1) params.set("page", String(nextPage));
      if (nextAction) params.set("action", nextAction);
      return `${pathname}?${params.toString()}`;
    },
    [pathname]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (actionFilter) params.set("action", actionFilter);
        const res = await fetch(`/api/audit-logs?${params.toString()}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load audit logs");
        setData(json);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, actionFilter]);

  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Security and compliance record of sensitive actions. {data?.pagination.total ?? 0} entries.
          </p>
        </div>
        <Select
          value={actionFilter}
          onChange={(e) => router.push(buildUrl(1, e.target.value))}
          className="w-56"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Entity</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading || !data ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-32" />
                      </td>
                    </tr>
                  ))
                ) : data.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      <ClipboardList className="h-8 w-8 mx-auto mb-2" />
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  data.data.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 font-medium">{log.action.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.entityType} <span className="text-xs">({log.entityId.slice(-8)})</span>
                      </td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <div>
                            <p className="font-medium">{log.user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.user.email} · {log.user.role}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 max-w-xs truncate">
                          {JSON.stringify(log.metadata ?? {})}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Page {data.pagination.page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => router.push(buildUrl(page - 1, actionFilter))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => router.push(buildUrl(page + 1, actionFilter))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
