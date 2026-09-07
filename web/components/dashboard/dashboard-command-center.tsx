"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  FileCheck2,
  RefreshCw,
  Satellite,
  ShieldAlert,
  Waves,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IncidentMap } from "@/components/incidents/location-preview";
import { StatusBadge } from "@/components/shared/badges";
import { formatDateTime, formatRelativeTime } from "@/lib/format-date";
import { RISK_LEVEL_CONFIG } from "@/lib/constants";
import type { IncidentStatus, Severity } from "@/types";

export type DashboardData = {
  metrics: { label: string; value: string; detail: string; icon: "water" | "incident" | "risk" | "alert" | "anomaly" | "scan" | "loss" }[];
  incidents: { id: string; title: string; location: string; latitude: number; longitude: number; severity: Severity; status: IncidentStatus; riskScore: number; waterChange: number | null; reportedAt: string; assignedInspector: string | null }[];
  alerts: { id: string; title: string; message: string; type: string; isRead: boolean; createdAt: string; incidentId: string | null; latitude: number | null; longitude: number | null; waterBodyName: string | null }[];
  monitors: { id: string; name: string; latitude: number; longitude: number; latestObservationDate: string | null; latestWaterAreaKm2: number | null; latestChangePercent: number | null; latestRiskLevel: string | null; lastCheckedAt: string | null }[];
  trend: { period: string; waterArea: number }[];
  pipeline: { label: string; count: number; tone: string }[];
  evidence: { id: string; title: string; fileType: string; status: string; uploadedAt: string; incidentId: string; fileUrl: string; waterBodyName: string | null; detectionDate: string; metadata: unknown }[];
  authorityActions: { id: string; action: string; entityType: string; createdAt: string; userName: string }[];
  canManageAuthority: boolean;
  canViewEvidence: boolean;
  renderedAt: string;
};

const metricIcons = { water: Waves, incident: ShieldAlert, risk: ShieldAlert, alert: Bell, anomaly: Satellite, scan: Satellite, loss: Waves };
const riskColor = (risk?: string | null) => RISK_LEVEL_CONFIG[risk as keyof typeof RISK_LEVEL_CONFIG]?.color ?? "text-slate-600 bg-slate-50 border-slate-200";
const riskLabel = (risk?: string | null) => RISK_LEVEL_CONFIG[risk as keyof typeof RISK_LEVEL_CONFIG]?.label ?? "Awaiting scan";
const actionLabel = (action: string) => action.replaceAll("_", " ").toLowerCase().replace(/^\w/, (char) => char.toUpperCase());

export function DashboardCommandCenter({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date(data.renderedAt));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const mapIncidents = useMemo(
    () => data.incidents.map((incident) => ({ ...incident, severity: incident.severity as string, status: incident.status as string })),
    [data.incidents]
  );
  const mapAlerts = useMemo(
    () => data.alerts.filter((alert) => alert.latitude !== null && alert.longitude !== null).map((alert) => ({ ...alert, latitude: alert.latitude!, longitude: alert.longitude! })),
    [data.alerts]
  );
  const mapMonitoringLocations = useMemo(
    () => data.monitors.map((monitor) => ({ id: monitor.id, name: monitor.name, latitude: monitor.latitude, longitude: monitor.longitude, riskLevel: monitor.latestRiskLevel, latestWaterAreaKm2: monitor.latestWaterAreaKm2, latestChangePercent: monitor.latestChangePercent, latestObservationDate: monitor.latestObservationDate })),
    [data.monitors]
  );
  const openIncident = useCallback((id: string) => router.push(`/incidents/${id}`), [router]);
  const openAlerts = useCallback(() => router.push("/alerts"), [router]);
  const openMonitoring = useCallback(() => router.push("/monitoring"), [router]);
  const riskCounts = ["NORMAL", "WATCH", "HIGH", "CRITICAL"].map((risk) => ({ risk, count: data.monitors.filter((monitor) => monitor.latestRiskLevel === risk).length }));
  const latestScan = [...data.monitors].sort((a, b) => (b.latestObservationDate ?? "").localeCompare(a.latestObservationDate ?? ""))[0];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 lg:space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-[#102f3a] px-5 py-6 text-white shadow-sm sm:px-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">AquaTrace / operations</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Water Intelligence Command Center</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Real-time overview of satellite monitoring, water anomalies, incidents, alerts, and investigations.</p>
            <p className="mt-3 text-xs text-slate-400">{now.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => router.refresh()}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" asChild><Link href="/map">Open full map <ArrowUpRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {data.metrics.map((metric) => {
          const Icon = metricIcons[metric.icon];
          const href = metric.label.includes("Incident") || metric.label.includes("Anomal") ? "/incidents" : metric.label.includes("Alert") ? "/alerts" : metric.label.includes("Satellite") || metric.label.includes("Water bod") || metric.label.includes("Loss") ? "/monitoring" : "/dashboard";
          return <Link key={metric.label} href={href}><Card className="h-full border-slate-200 transition-colors hover:border-cyan-300 hover:bg-cyan-50/20"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">{metric.label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-[#173b45]">{metric.value}</p></div><Icon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-[11px] text-muted-foreground">{metric.detail}</p></CardContent></Card></Link>;
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden border-slate-200"><CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4"><div><CardTitle className="text-lg">Water monitoring map</CardTitle><p className="mt-1 text-xs text-muted-foreground">Green normal · yellow watch · orange high · red critical.</p></div><Link href="/map" className="text-xs font-medium text-primary hover:underline">Full map <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link></CardHeader><CardContent className="p-0"><div className="h-[390px] sm:h-[470px]"><IncidentMap incidents={mapIncidents} satelliteAlerts={mapAlerts} monitoringLocations={mapMonitoringLocations} onMarkerClick={openIncident} onSatelliteMarkerClick={openAlerts} onMonitoringMarkerClick={openMonitoring} height="100%" /></div></CardContent></Card>
        <div className="space-y-6">
          <Card className="border-slate-200"><CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4"><div><CardTitle className="text-lg">Recent alerts</CardTitle><p className="mt-1 text-xs text-muted-foreground">Latest response signals</p></div><Link href="/alerts" className="text-xs text-primary hover:underline">View all</Link></CardHeader><CardContent className="p-4">{data.alerts.length === 0 ? <Empty icon={Bell} text="No alerts recorded." /> : <div className="space-y-3">{data.alerts.map((alert) => <Link key={alert.id} href="/alerts" className="block rounded-lg border border-slate-100 p-3 hover:border-cyan-200 hover:bg-cyan-50/30"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-semibold text-[#173b45]">{alert.title}</p><Badge variant="outline" className={alert.type.includes("CRITICAL") ? "text-red-600" : alert.type.includes("HIGH") ? "text-orange-600" : "text-yellow-600"}>{alert.type.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{alert.waterBodyName ?? "Unlinked water body"} · {formatRelativeTime(alert.createdAt)}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{alert.message}</p></Link>)}</div>}</CardContent></Card>
          <Card className="border-slate-200"><CardHeader className="pb-3"><CardTitle className="text-lg">Incident pipeline</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{data.pipeline.map((stage) => <Link key={stage.label} href={`/incidents?status=${stage.label === "Detected" ? "DETECTED" : stage.label === "Investigating" ? "UNDER_REVIEW" : stage.label.toUpperCase()}`} className="rounded-lg bg-slate-50 p-3 hover:bg-cyan-50"><p className="text-[11px] font-medium text-muted-foreground">{stage.label}</p><p className={`mt-2 text-2xl font-semibold ${stage.tone}`}>{stage.count}</p></Link>)}</div></CardContent></Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <Card className="border-slate-200"><CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4"><div><CardTitle className="text-lg">Priority investigations</CardTitle><p className="mt-1 text-xs text-muted-foreground">Severity-sorted current anomalies and incidents</p></div><Link href="/incidents" className="text-xs text-primary hover:underline">All incidents</Link></CardHeader><CardContent className="p-4">{data.incidents.length === 0 ? <Empty icon={CheckCircle2} text="No active investigations." /> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="pb-3 pr-3 font-medium">Water body</th><th className="pb-3 pr-3 font-medium">Location</th><th className="pb-3 pr-3 font-medium">Risk</th><th className="pb-3 pr-3 font-medium">Change</th><th className="pb-3 pr-3 font-medium">Detected</th><th className="pb-3 pr-3 font-medium">Inspector</th><th className="pb-3 pr-3 font-medium">Status</th><th /></tr></thead><tbody>{data.incidents.map((incident) => <tr key={incident.id} className="border-t border-slate-100"><td className="py-3 pr-3 font-semibold text-[#173b45]">{incident.location}</td><td className="py-3 pr-3 text-xs text-muted-foreground">{incident.latitude.toFixed(3)}, {incident.longitude.toFixed(3)}</td><td className="py-3 pr-3"><Badge variant="outline">{incident.severity}</Badge><span className="ml-2 text-xs font-semibold">{incident.riskScore}/100</span></td><td className="py-3 pr-3 text-muted-foreground">{incident.waterChange === null ? "—" : `${incident.waterChange.toFixed(1)}%`}</td><td className="py-3 pr-3 text-xs text-muted-foreground">{formatDateTime(incident.reportedAt)}</td><td className="py-3 pr-3 text-xs text-muted-foreground">{incident.assignedInspector ?? "Unassigned"}</td><td className="py-3 pr-3"><StatusBadge status={incident.status} /></td><td className="py-3 text-right"><Button variant="ghost" size="sm" asChild><Link href={`/incidents/${incident.id}`}>View</Link></Button></td></tr>)}</tbody></table></div>}</CardContent></Card>
        <Card className="border-slate-200"><CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4"><div><CardTitle className="text-lg">Water extent trend</CardTitle><p className="mt-1 text-xs text-muted-foreground">Historical observed water area (km²)</p></div><Link href="/analytics" className="text-xs text-primary hover:underline">Analytics</Link></CardHeader><CardContent><div className="h-64">{data.trend.length === 0 ? <Empty icon={Waves} text="No real satellite scan history available." /> : <ResponsiveContainer width="100%" height="100%"><LineChart data={data.trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="period" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="waterArea" name="Water area (km²)" stroke="#0e7490" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>}</div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><p className="text-muted-foreground">Current water area</p><p className="font-semibold">{latestScan?.latestWaterAreaKm2 == null ? "—" : `${latestScan.latestWaterAreaKm2.toFixed(2)} km²`}</p></div><div><p className="text-muted-foreground">Previous / change</p><p className="font-semibold">{latestScan?.latestChangePercent == null ? "—" : `${latestScan.latestChangePercent.toFixed(1)}%`}</p></div></div></CardContent></Card>
      </section>

      {data.canManageAuthority && <section><Card className="border-slate-200"><CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4"><div><CardTitle className="text-lg">Satellite monitoring summary</CardTitle><p className="mt-1 text-xs text-muted-foreground">Sentinel-2 L2A · Copernicus Data Space</p></div><Link href="/monitoring" className="text-xs text-primary hover:underline">Monitoring console</Link></CardHeader><CardContent className="p-4">{data.monitors.length === 0 ? <Empty icon={Satellite} text="No satellite monitoring areas configured." /> : <><div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><SummaryStat label="Monitored areas" value={data.monitors.length} /><SummaryStat label="Latest scan" value={latestScan?.latestObservationDate ? formatDateTime(latestScan.latestObservationDate) : "—"} /><SummaryStat label="Normal" value={riskCounts[0].count} tone="text-emerald-600" /><SummaryStat label="Watch / High" value={`${riskCounts[1].count} / ${riskCounts[2].count}`} tone="text-amber-600" /><SummaryStat label="Critical" value={riskCounts[3].count} tone="text-red-600" /></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{data.monitors.slice(0, 8).map((monitor) => <div key={monitor.id} className="rounded-lg border border-slate-100 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-[#173b45]">{monitor.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{monitor.latestObservationDate ? formatDateTime(monitor.latestObservationDate) : "Awaiting scan"}</p></div><Badge variant="outline" className={riskColor(monitor.latestRiskLevel)}>{riskLabel(monitor.latestRiskLevel)}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><p className="text-muted-foreground">Water area</p><p className="mt-1 font-semibold">{monitor.latestWaterAreaKm2 == null ? "—" : `${monitor.latestWaterAreaKm2.toFixed(2)} km²`}</p></div><div><p className="text-muted-foreground">Change</p><p className="mt-1 font-semibold">{monitor.latestChangePercent == null ? "—" : `${monitor.latestChangePercent.toFixed(1)}%`}</p></div></div></div>)}</div></>}</CardContent></Card></section>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
        <Card className="border-slate-200"><CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4"><div><CardTitle className="text-lg">Recent evidence</CardTitle><p className="mt-1 text-xs text-muted-foreground">Evidence attached to investigations</p></div>{data.canViewEvidence && <Button variant="outline" size="sm" asChild><Link href="/evidence">View Evidence</Link></Button>}</CardHeader><CardContent className="p-4">{!data.canViewEvidence ? <Restricted text="Evidence review is available to inspectors and authority staff." /> : data.evidence.length === 0 ? <Empty icon={FileCheck2} text="No evidence uploaded yet." /> : <div className="space-y-2">{data.evidence.map((item) => <Link key={item.id} href={`/incidents/${item.incidentId}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50"><div className="flex min-w-0 items-center gap-3"><FileCheck2 className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.waterBodyName ?? "Water body unavailable"} · {formatRelativeTime(item.uploadedAt)}</p></div></div><Badge variant="outline">{item.status}</Badge></Link>)}</div>}</CardContent></Card>
        {data.canManageAuthority && <Card className="border-slate-200"><CardHeader className="pb-3"><CardTitle className="text-lg">Authority actions</CardTitle><p className="mt-1 text-xs text-muted-foreground">Recent accountable activity</p></CardHeader><CardContent>{data.authorityActions.length === 0 ? <Empty icon={ShieldAlert} text="No authority activity recorded." /> : <div className="space-y-2">{data.authorityActions.map((action) => <Link key={action.id} href="/authority" className="block rounded-lg border border-slate-100 p-3 hover:bg-slate-50"><p className="text-sm font-medium text-[#173b45]">{actionLabel(action.action)}</p><p className="mt-1 text-xs text-muted-foreground">{action.userName} · {formatRelativeTime(action.createdAt)}</p></Link>)}</div>}</CardContent></Card>}
      </section>
    </div>
  );
}

function SummaryStat({ label, value, tone = "text-[#173b45]" }: { label: string; value: string | number; tone?: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className={`mt-1 text-sm font-semibold ${tone}`}>{value}</p></div>;
}

function Empty({ icon: Icon, text }: { icon: typeof Bell; text: string }) {
  return <div className="flex min-h-24 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground"><Icon className="h-6 w-6" /><span>{text}</span></div>;
}

function Restricted({ text }: { text: string }) {
  return <div className="flex min-h-24 items-center justify-center rounded-lg bg-slate-50 px-4 text-center text-sm text-muted-foreground">{text}</div>;
}
