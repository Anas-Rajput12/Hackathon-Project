import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, User, Droplets, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/format-date";
import { WATER_BODY_TYPES } from "@/lib/constants";
import { IncidentDetailClient } from "@/components/incidents/incident-detail-client";
import { EvidenceGallery } from "@/components/incidents/evidence-gallery";
import { EvidenceUpload } from "@/components/incidents/evidence-upload";
import { AiAnalysisPanel } from "@/components/incidents/ai-analysis-panel";
import { LocationPreview } from "@/components/incidents/location-preview";
import { canReviewEvidence, canAssignInspector, allowedNextStatuses, isAdmin } from "@/lib/rbac";
import type { Role, IncidentStatus } from "@/types";
import { AssignmentPanel } from "@/components/incidents/assignment-panel";

type Params = { params: Promise<{ id: string }> };

export default async function IncidentDetailPage({ params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      reportedBy: { select: { id: true, name: true, email: true, role: true, image: true } },
      waterBody: true,
      evidence: {
        orderBy: { uploadedAt: "desc" },
        include: { uploadedBy: { select: { id: true, name: true, image: true } } },
      },
      agentAnalyses: { orderBy: { runAt: "asc" } },
      assignment: {
        include: {
          inspector: { select: { id: true, name: true, image: true } },
          assignedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!incident) notFound();

  const agentAnalyses = incident.agentAnalyses.filter((a) => a.agentName !== "final");
  const pipeline =
    agentAnalyses.length > 0
      ? agentAnalyses.map((a) => ({
          name: a.agentName,
          label: agentLabel(a.agentName),
          description: agentDescription(a.agentName),
          status: a.status as "PENDING" | "RUNNING" | "COMPLETED" | "FAILED",
          confidence: a.confidence,
          output: (a.output as Record<string, unknown>) ?? {},
        }))
      : [];

  const currentUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: ((session.user.role as string) || "CITIZEN") as Role,
    image: session.user.image ?? null,
  };

  const canEdit =
    incident.reportedById === currentUser.id ||
    currentUser.role === "INSPECTOR" ||
    currentUser.role === "AUTHORITY" ||
    currentUser.role === "ADMIN";

  const inspectors = await prisma.user.findMany({
    where: { role: "INSPECTOR" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const allowedStatuses = allowedNextStatuses(
    incident.status as IncidentStatus,
    isAdmin(currentUser)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/incidents">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
      </div>

      <IncidentDetailClient
        incident={{
          id: incident.id,
          title: incident.title,
          severity: incident.severity as never,
          status: incident.status as never,
        }}
        canEdit={canEdit}
        allowedStatuses={allowedStatuses}
        isAdminOverride={isAdmin(currentUser)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {incident.description}
              </p>
              <Separator />
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <MetaRow icon={<User className="h-4 w-4" />} label="Reporter">
                  {incident.reportedBy.name}
                </MetaRow>
                <MetaRow icon={<Calendar className="h-4 w-4" />} label="Reported">
                  {formatDateTime(incident.reportedAt)}
                </MetaRow>
                <MetaRow icon={<MapPin className="h-4 w-4" />} label="Location">
                  {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                </MetaRow>
                <MetaRow icon={<Droplets className="h-4 w-4" />} label="Pollution">
                  {incident.pollutionType}
                </MetaRow>
                {incident.waterBody && (
                  <MetaRow icon={<Droplets className="h-4 w-4" />} label="Water Body">
                    {WATER_BODY_TYPES[incident.waterBody.type as keyof typeof WATER_BODY_TYPES]} · {incident.waterBody.name}
                  </MetaRow>
                )}
                {incident.resolvedAt && (
                  <MetaRow icon={<Calendar className="h-4 w-4" />} label="Resolved">
                    {formatDateTime(incident.resolvedAt)}
                  </MetaRow>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Evidence</CardTitle>
              <EvidenceUpload incidentId={incident.id} disabled={!canEdit} />
            </CardHeader>
            <CardContent>
              <EvidenceGallery
                evidence={incident.evidence}
                canReview={canReviewEvidence({ role: currentUser.role } as { role: Role })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LocationPreview
                latitude={incident.latitude}
                longitude={incident.longitude}
                title={incident.title}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <AssignmentPanel
            incidentId={incident.id}
            inspectors={inspectors}
            assignment={incident.assignment}
            canAssign={canAssignInspector(currentUser)}
          />
          <AiAnalysisPanel pipeline={pipeline} incidentId={incident.id} canRun={canEdit} />
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="col-span-1">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium truncate">{children}</dd>
    </div>
  );
}

function agentLabel(name: string): string {
  const map: Record<string, string> = {
    evidence: "Evidence Agent",
    water_quality: "Water Quality Agent",
    verification: "Verification Agent",
    risk_assessment: "Risk Assessment Agent",
    resolution: "Resolution Agent",
  };
  return map[name] ?? name;
}

function agentDescription(name: string): string {
  const map: Record<string, string> = {
    evidence: "Analyzes uploaded photos, documents, and descriptions for credibility.",
    water_quality: "Estimates water quality parameters and likely contaminants.",
    verification: "Cross-checks evidence for internal consistency.",
    risk_assessment: "Evaluates population and environmental impact risk.",
    resolution: "Recommends next actions and stakeholders.",
  };
  return map[name] ?? "";
}
