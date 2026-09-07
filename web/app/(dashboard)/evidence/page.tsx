import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileImage, FileText, Film, Clock, AlertTriangle, ArrowUpRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { requireAuth, requireRole } from "@/lib/api/auth";
import { EvidenceReviewActions } from "@/components/evidence/evidence-review-actions";
import { formatDateTime } from "@/lib/format-date";

const typeIcons: Record<string, React.ReactNode> = {
  IMAGE: <FileImage className="h-5 w-5" />,
  VIDEO: <Film className="h-5 w-5" />,
  DOCUMENT: <FileText className="h-5 w-5" />,
};

const statusColors: Record<string, string> = {
  PENDING: "text-amber-600 bg-amber-50 border-amber-200",
  VERIFIED: "text-green-600 bg-green-50 border-green-200",
  REJECTED: "text-red-600 bg-red-50 border-red-200",
};

export default async function EvidencePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const user = await requireAuth();
  requireRole(user, ["INSPECTOR", "AUTHORITY", "ADMIN"]);

  const evidence = await prisma.evidence.findMany({
    orderBy: [{ status: "asc" }, { uploadedAt: "desc" }],
    take: 100,
    include: {
      incident: { select: { id: true, title: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  });
  const satelliteScans = await prisma.satelliteScan.findMany({
    where: { isSimulation: false, status: "COMPLETED" },
    orderBy: { observationDate: "desc" },
    take: 50,
    include: {
      monitoring: {
        include: { waterBody: { select: { name: true } } },
      },
    },
  });
  const previousScanById = new Map(
    satelliteScans.map((scan, index) => [
      scan.id,
      satelliteScans
        .slice(index + 1)
        .find(
          (candidate) =>
            candidate.monitoringId === scan.monitoringId &&
            candidate.observationDate < scan.observationDate
        ) ?? null,
    ])
  );

  const pendingCount = evidence.filter((e) => e.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evidence Review</h1>
          <p className="text-sm text-muted-foreground">
            Review and verify uploaded evidence. {pendingCount} pending.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/incidents" className="gap-1">
            View Incidents <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uploaded Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          {evidence.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No evidence yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Evidence will appear here once uploaded to incidents.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {evidence.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5 shrink-0 text-muted-foreground">{typeIcons[item.fileType]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {item.description || item.fileUrl.split("/").pop() || "Evidence"}
                        </p>
                        <Badge variant="outline" className={statusColors[item.status]}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Incident: {" "}
                        <Link href={`/incidents/${item.incident.id}`} className="text-primary hover:underline">
                          {item.incident.title}
                        </Link>
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDateTime(item.uploadedAt)}
                        </span>
                        <span>{item.fileType}</span>
                        <span>Uploaded by {item.uploadedBy.name}</span>
                      </div>
                      <div className="mt-2">
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Open file →
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <EvidenceReviewActions evidenceId={item.id} currentStatus={item.status as never} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Satellite Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          {satelliteScans.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Satellite evidence will appear after a successful Sentinel-2 scan.
            </p>
          ) : (
            <div className="space-y-5">
              {satelliteScans.map((scan) => (
                <div key={scan.id} className="rounded-lg border p-4">
                  {(() => {
                    const previousScan = previousScanById.get(scan.id);
                    return (
                      <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{scan.monitoring.waterBody.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(scan.observationDate)} · {scan.productTitle ?? scan.productId ?? "Sentinel-2 L2A"}
                      </p>
                    </div>
                    <Badge variant="outline">{scan.riskLevel}</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {previousScan?.rgbImageRef && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Before RGB imagery</p>
                        <img src={previousScan.rgbImageRef} alt={`Before RGB imagery for ${scan.monitoring.waterBody.name}`} className="aspect-[3/2] w-full rounded-md border object-cover" />
                      </div>
                    )}
                    {scan.rgbImageRef && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">RGB imagery</p>
                        <img src={scan.rgbImageRef} alt={`RGB imagery for ${scan.monitoring.waterBody.name}`} className="aspect-[3/2] w-full rounded-md border object-cover" />
                      </div>
                    )}
                    {scan.ndwiImageRef && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Water detection (NDWI)</p>
                        <img src={scan.ndwiImageRef} alt={`NDWI water detection for ${scan.monitoring.waterBody.name}`} className="aspect-[3/2] w-full rounded-md border object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>After: {scan.waterAreaKm2.toFixed(2)} km²</span>
                    <span>Before: {scan.previousWaterAreaKm2 == null ? "Baseline observation" : `${scan.previousWaterAreaKm2.toFixed(2)} km²`}</span>
                    <span>Change: {scan.previousWaterAreaKm2 == null ? "No previous comparison available." : `${scan.changePercent > 0 ? "+" : ""}${scan.changePercent.toFixed(1)}%`}</span>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
