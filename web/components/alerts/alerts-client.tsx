"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { ALERT_TYPE_CONFIG } from "@/lib/constants";
import { formatRelativeTime } from "@/components/shared/badges";
import type { AlertType } from "@/types";

type AlertItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
  incidentId: string | null;
};

type AlertsClientProps = {
  alerts: AlertItem[];
  pagination: {
    page: number;
    total: number;
    totalPages: number;
    limit: number;
  };
};

export function AlertsClient({ alerts: initial, pagination }: AlertsClientProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const markRead = (ids: string[]) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!response.ok) throw new Error("Unable to update the alert.");

        setAlerts((current) => current.map((alert) => (ids.includes(alert.id) ? { ...alert, isRead: true } : alert)));
        router.refresh();
      } catch {
        toast.error("Could not update the alert. Please try again.");
      }
    });
  };

  const markAllRead = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
        if (!response.ok) throw new Error("Unable to update alerts.");

        setAlerts((current) => current.map((alert) => ({ ...alert, isRead: true })));
        router.refresh();
      } catch {
        toast.error("Could not mark alerts as read. Please try again.");
      }
    });
  };

  const unreadCount = alerts.filter((alert) => !alert.isRead).length;
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Stay informed about critical events and updates.
            {unreadCount > 0 && ` (${unreadCount} unread on this page)`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={isPending} className="w-fit gap-1.5">
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      <div className="divide-y rounded-lg border">
        {alerts.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No alerts</p>
            <p className="text-sm text-muted-foreground">You&apos;ll be notified when incidents are reported or updated.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const config = ALERT_TYPE_CONFIG[alert.type as AlertType];
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-4 transition-colors ${alert.isRead ? "bg-muted/20" : "hover:bg-muted/40"}`}
              >
                <div className="mt-0.5 shrink-0">
                  {alert.isRead ? <CheckCircle2 className="h-5 w-5 text-muted-foreground/50" /> : <Bell className="h-5 w-5 text-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-medium ${alert.isRead ? "text-muted-foreground" : ""}`}>{alert.title}</p>
                    {!alert.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(alert.createdAt)}</p>
                    {alert.incidentId && (
                      <Link href={`/incidents/${alert.incidentId}`} className="text-xs text-primary hover:underline">
                        View incident &rarr;
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {config && (
                    <Badge variant="outline" className={config.color}>
                      {config.label}
                    </Badge>
                  )}
                  {!alert.isRead && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => markRead([alert.id])} disabled={isPending}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Read
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> of{" "}
            <span className="font-medium">{pagination.total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => router.push(`/alerts?page=${pagination.page - 1}`)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="px-2 text-sm tabular-nums">Page {pagination.page} of {pagination.totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => router.push(`/alerts?page=${pagination.page + 1}`)}
              className="gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
