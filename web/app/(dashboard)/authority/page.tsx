import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  FileImage,
  BarChart3,
  Users,
  ClipboardList,
  ArrowUpRight,
  MapPin,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { requireAuth, isAuthorityOrAdmin } from "@/lib/api/auth";
import { SeverityBadge, StatusBadge } from "@/components/shared/badges";
import { formatRelativeTime } from "@/lib/format-date";
import type { Severity, IncidentStatus } from "@/types";

export default async function AuthorityPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const user = await requireAuth();
  if (!isAuthorityOrAdmin(user)) redirect("/dashboard");

  const now = new Date();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

  const [
    inspectorCount,
    openAssignments,
    resolvedThisWeek,
    pendingEvidence,
    criticalCount,
    unassignedOpen,
    recentIncidents,
    recentAssignments,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "INSPECTOR" } }),
    prisma.assignment.count(),
    prisma.incident.count({
      where: { status: "RESOLVED", resolvedAt: { gte: startOfWeek } },
    }),
    prisma.evidence.count({ where: { status: "PENDING" } }),
    prisma.incident.count({ where: { severity: "CRITICAL" } }),
    prisma.incident.count({ where: { status: "OPEN", assignment: { is: null } } }),
    prisma.incident.findMany({
      where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
      take: 6,
      orderBy: [{ severity: "desc" }, { reportedAt: "desc" }],
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        pollutionType: true,
        reportedAt: true,
        waterBody: { select: { name: true } },
        assignment: { select: { inspector: { select: { name: true } } } },
      },
    }),
    prisma.assignment.findMany({
      take: 5,
      orderBy: { assignedAt: "desc" },
      select: {
        id: true,
        notes: true,
        assignedAt: true,
        incident: { select: { id: true, title: true, status: true } },
        inspector: { select: { id: true, name: true } },
        assignedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Water Integrity Command Center</h1>
          <p className="text-sm text-muted-foreground">
            Authority oversight, inspector assignments, and critical incident monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/evidence" className="gap-1">
              <FileImage className="h-4 w-4" /> Review Evidence
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/analytics" className="gap-1">
              <BarChart3 className="h-4 w-4" /> Analytics
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inspectors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inspectorCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{openAssignments} active assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Assignments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openAssignments}</div>
            <p className="text-xs text-muted-foreground mt-1">{unassignedOpen} unassigned open incidents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved This Week</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">Since {startOfWeek.toLocaleDateString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Evidence</CardTitle>
            <FileImage className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingEvidence}</div>
            <p className="text-xs text-muted-foreground mt-1">{criticalCount} critical incidents</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Incidents Needing Action</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/incidents" className="gap-1">
                  View All <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentIncidents.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No open incidents requiring action.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentIncidents.map((incident) => (
                    <Link
                      key={incident.id}
                      href={`/incidents/${incident.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{incident.title}</p>
                          {incident.assignment ? null : (
                            <Badge variant="outline" className="text-[10px]">Unassigned</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {incident.waterBody?.name ?? incident.pollutionType} · {" "}
                          {incident.assignment?.inspector?.name
                            ? `Assigned to ${incident.assignment.inspector.name}`
                            : "No inspector assigned"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <SeverityBadge severity={incident.severity as Severity} />
                        <StatusBadge status={incident.status as IncidentStatus} />
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          {formatRelativeTime(incident.reportedAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Assignments</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/incidents" className="gap-1">
                  Manage <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentAssignments.length === 0 ? (
                <div className="text-center py-6">
                  <UserCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No assignments yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAssignments.map((a) => (
                    <div key={a.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium truncate">{a.incident.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Assigned to {a.inspector.name} by {a.assignedBy.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(a.assignedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Administration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/users">
                  <Users className="h-4 w-4 mr-2" /> User Management
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/audit-logs">
                  <ClipboardList className="h-4 w-4 mr-2" /> Audit Logs
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
