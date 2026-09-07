"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { toast } from "sonner";

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "#16a34a",
  MEDIUM: "#ca8a04",
  HIGH: "#ea580c",
  CRITICAL: "#dc2626",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#2563eb",
  UNDER_REVIEW: "#d97706",
  VERIFIED: "#9333ea",
  RESOLVED: "#16a34a",
  CLOSED: "#4b5563",
};

const TYPE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#9333ea",
  "#0891b2",
  "#64748b",
  "#84cc16",
];

type Summary = {
  total: number;
  active: number;
  critical: number;
  high: number;
  verified: number;
  resolved: number;
  pendingVerification: number;
  assigned: number;
  resolutionRate: number;
  bySeverity: { name: string; count: number }[];
  byStatus: { name: string; count: number }[];
  byPollutionType: { name: string; count: number }[];
  byWaterBody: { name: string; count: number }[];
};

type Trends = {
  groupBy: "day" | "week" | "month";
  trends: { period: string; reported: number; resolved: number }[];
};

export function AnalyticsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [summaryRes, trendsRes] = await Promise.all([
          fetch("/api/analytics/summary"),
          fetch(`/api/analytics/trends?groupBy=${groupBy}`),
        ]);
        const summaryJson = await summaryRes.json().catch(() => ({}));
        const trendsJson = await trendsRes.json().catch(() => ({}));
        if (!summaryRes.ok) throw new Error(summaryJson?.error?.message ?? "Failed to load summary");
        if (!trendsRes.ok) throw new Error(trendsJson?.error?.message ?? "Failed to load trends");
        setSummary(summaryJson.data);
        setTrends(trendsJson.data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [groupBy]);

  const stats = summary
    ? [
        { label: "Total Reports", value: summary.total, icon: TrendingUp },
        { label: "Active Incidents", value: summary.active, icon: AlertTriangle },
        { label: "Resolved", value: summary.resolved, icon: CheckCircle2 },
        { label: "Resolution Rate", value: `${summary.resolutionRate}%`, icon: CheckCircle2 },
      ]
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Incident metrics, trends, and distributions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as never)} className="w-40">
            <option value="day">By Day</option>
            <option value="week">By Week</option>
            <option value="month">By Month</option>
          </Select>
          <Button variant="outline" size="sm" asChild>
            <a href="/map">View Map</a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading || !stats
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reported vs Resolved Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {loading || !trends ? (
              <Skeleton className="h-full w-full" />
            ) : trends.trends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No trend data available for selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.trends} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reported" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="resolved" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidents by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {loading || !summary ? (
                <Skeleton className="h-full w-full" />
              ) : summary.bySeverity.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.bySeverity}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {summary.bySeverity.map((entry) => (
                        <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? "#64748b"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidents by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {loading || !summary ? (
                <Skeleton className="h-full w-full" />
              ) : summary.byStatus.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.byStatus} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {summary.byStatus.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#64748b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pollution Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {loading || !summary ? (
                <Skeleton className="h-full w-full" />
              ) : summary.byPollutionType.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.byPollutionType} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={110} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {summary.byPollutionType.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Water Bodies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {loading || !summary ? (
                <Skeleton className="h-full w-full" />
              ) : summary.byWaterBody.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.byWaterBody.slice(0, 8)} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0891b2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
