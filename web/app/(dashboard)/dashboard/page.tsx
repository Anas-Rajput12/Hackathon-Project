import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthorityOrAdmin, isStaff } from "@/lib/rbac";
import { DashboardCommandCenter, type DashboardData } from "@/components/dashboard/dashboard-command-center";
import type { IncidentStatus, Role, Severity } from "@/types";

const severityScore: Record<Severity, number> = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 95 };

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const role = ((session.user.role as string) || "CITIZEN") as Role;
  const userId = session.user.id;
  const roleWhere = role === "AUTHORITY" || role === "ADMIN" ? {} : role === "INSPECTOR" ? { OR: [{ reportedById: userId }, { assignment: { inspectorId: userId } }] } : { reportedById: userId };
  const management = isAuthorityOrAdmin({ role });
  const staff = isStaff({ role });
  const renderedAt = new Date().toISOString();

  const [totalIncidents, activeIncidents, highRisk, alertCount, waterBodies, incidents, alerts, monitors, scans, evidence, pipeline, authorityActions] = await Promise.all([
    prisma.incident.count({ where: roleWhere }),
    prisma.incident.count({ where: { AND: [roleWhere, { status: { in: ["DETECTED", "OPEN", "UNDER_REVIEW"] as IncidentStatus[] } }] } }),
    prisma.incident.count({ where: { AND: [roleWhere, { severity: { in: ["HIGH", "CRITICAL"] } }] } }),
    prisma.alert.count({ where: { userId, isRead: false } }),
    prisma.waterBody.count(),
    prisma.incident.findMany({ where: { AND: [roleWhere, { status: { in: ["DETECTED", "UNDER_REVIEW", "VERIFIED"] as IncidentStatus[] } }] }, take: 8, orderBy: [{ severity: "desc" }, { reportedAt: "desc" }], select: { id: true, title: true, latitude: true, longitude: true, severity: true, status: true, reportedAt: true, waterBody: { select: { id: true, name: true } }, assignment: { select: { inspector: { select: { name: true } } } } } }),
    prisma.alert.findMany({ where: { userId }, take: 5, orderBy: { createdAt: "desc" }, select: { id: true, title: true, message: true, type: true, isRead: true, createdAt: true, incidentId: true, latitude: true, longitude: true, incident: { select: { waterBody: { select: { name: true } } } } } }),
    management ? prisma.satelliteMonitoring.findMany({ where: { status: "ACTIVE" }, take: 8, orderBy: { updatedAt: "desc" }, select: { id: true, latitude: true, longitude: true, latestObservationDate: true, latestWaterAreaKm2: true, previousWaterAreaKm2: true, latestChangePercent: true, latestRiskLevel: true, lastCheckedAt: true, waterBody: { select: { id: true, name: true } } } }) : Promise.resolve([]),
    management ? prisma.satelliteScan.findMany({ where: { isSimulation: false, status: "COMPLETED" }, take: 60, orderBy: { observationDate: "asc" }, select: { id: true, observationDate: true, waterAreaKm2: true, previousWaterAreaKm2: true, changePercent: true, riskLevel: true, dataSource: true, monitoring: { select: { waterBody: { select: { name: true } } } } } }) : Promise.resolve([]),
    staff ? prisma.evidence.findMany({ take: 6, orderBy: { uploadedAt: "desc" }, select: { id: true, description: true, fileType: true, status: true, uploadedAt: true, incidentId: true, fileUrl: true, metadata: true, incident: { select: { waterBody: { select: { name: true } }, reportedAt: true } } } }) : Promise.resolve([]),
    Promise.all(["DETECTED", "UNDER_REVIEW", "VERIFIED", "RESOLVED"].map((status) => prisma.incident.count({ where: { AND: [roleWhere, { status: status as IncidentStatus }] } }))),
    management ? prisma.auditLog.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }) : Promise.resolve([]),
  ]);

  const trendMap = new Map<string, { waterArea: number; scans: number }>();
  for (const scan of scans) { const period = scan.observationDate.toISOString().slice(0, 10); const current = trendMap.get(period) ?? { waterArea: 0, scans: 0 }; current.waterArea += scan.waterAreaKm2; current.scans += 1; trendMap.set(period, current); }

  const latestWaterArea = monitors.reduce((sum, monitor) => sum + (monitor.latestWaterAreaKm2 ?? 0), 0);
  const waterLoss = monitors.reduce((sum, monitor) => sum + (monitor.latestChangePercent !== null && monitor.latestChangePercent < 0 && monitor.latestWaterAreaKm2 !== null && monitor.previousWaterAreaKm2 !== null ? Math.max(0, monitor.previousWaterAreaKm2 - monitor.latestWaterAreaKm2) : 0), 0);
  const anomalyCount = monitors.filter((monitor) => monitor.latestRiskLevel && monitor.latestRiskLevel !== "NORMAL").length;
  const data: DashboardData = {
    metrics: [
      { label: "Monitored water bodies", value: management ? monitors.length.toLocaleString() : waterBodies.toLocaleString(), detail: management ? `${totalIncidents.toLocaleString()} total incidents tracked` : "Registered water bodies", icon: "water" },
      { label: "Active incidents", value: activeIncidents.toLocaleString(), detail: "Open + under review", icon: "incident" },
      { label: "High/Critical risks", value: highRisk.toLocaleString(), detail: "Require prioritization", icon: "risk" },
      { label: "Active alerts", value: alertCount.toLocaleString(), detail: "Unread response signals", icon: "alert" },
      { label: "Water anomalies", value: management ? anomalyCount.toLocaleString() : "—", detail: management ? "Latest scan outside normal" : "Authority data only", icon: "anomaly" },
      { label: "Estimated water loss", value: management ? `${waterLoss.toFixed(2)} km²` : "—", detail: management ? `${latestWaterArea.toFixed(2)} km² currently observed` : "Authority data only", icon: "loss" },
    ],
    incidents: incidents.map((incident) => ({ id: incident.id, title: incident.title, location: incident.waterBody?.name ?? `${incident.latitude.toFixed(2)}, ${incident.longitude.toFixed(2)}`, latitude: incident.latitude, longitude: incident.longitude, severity: incident.severity, status: incident.status, riskScore: severityScore[incident.severity], waterChange: incident.waterBody ? monitors.find((monitor) => monitor.waterBody.id === incident.waterBody!.id)?.latestChangePercent ?? null : null, reportedAt: incident.reportedAt.toISOString(), assignedInspector: incident.assignment?.inspector.name ?? null })),
    alerts: alerts.map((alert) => ({ ...alert, createdAt: alert.createdAt.toISOString(), waterBodyName: alert.incident?.waterBody?.name ?? null })),
    monitors: monitors.map((monitor) => ({ ...monitor, name: monitor.waterBody.name, latestObservationDate: monitor.latestObservationDate?.toISOString() ?? null, lastCheckedAt: monitor.lastCheckedAt?.toISOString() ?? null })),
    trend: Array.from(trendMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([period, values]) => ({ period, waterArea: values.scans ? values.waterArea / values.scans : 0 })),
    pipeline: ["DETECTED", "UNDER_REVIEW", "VERIFIED", "RESOLVED"].map((_, index) => ({ label: ["Detected", "Investigating", "Verified", "Resolved"][index], count: pipeline[index], tone: ["text-cyan-600", "text-amber-600", "text-violet-600", "text-emerald-600"][index] })),
    evidence: evidence.map((item) => ({ id: item.id, title: item.description || `${item.fileType} evidence`, fileType: item.fileType, status: item.status, uploadedAt: item.uploadedAt.toISOString(), incidentId: item.incidentId, fileUrl: item.fileUrl, waterBodyName: item.incident.waterBody?.name ?? null, detectionDate: item.incident.reportedAt.toISOString(), metadata: item.metadata })),
    authorityActions: authorityActions.map((action) => ({ id: action.id, action: action.action, entityType: action.entityType, createdAt: action.createdAt.toISOString(), userName: action.user?.name ?? "System" })),
    canManageAuthority: management,
    canViewEvidence: staff,
    renderedAt,
  };

  return <DashboardCommandCenter data={data} />;
}
