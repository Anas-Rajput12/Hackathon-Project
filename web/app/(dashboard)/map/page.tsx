import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AlertTriangle, MapPin, Droplets } from "lucide-react";
import Link from "next/link";
import { MapLegend } from "@/components/incidents/location-preview";
import { IncidentMapClient } from "./incident-map-client";
import { SeverityBadge } from "@/components/shared/badges";
import { formatRelativeTime } from "@/lib/format-date";
import { IncidentFilters } from "@/components/incidents/incident-filters";
import { SEVERITIES, INCIDENT_STATUSES } from "@/lib/validations/incident";
import { WATER_BODY_TYPES } from "@/lib/constants";
import type { Severity } from "@/types";

type SearchParams = {
  severity?: string;
  status?: string;
  pollutionType?: string;
  waterBodyId?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

type WaterBodyCoordinates = {
  lat?: unknown;
  lng?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  geometry?: unknown;
};

function waterBodyMapData(waterBody: {
  id: string;
  name: string;
  type: string;
  coordinates: unknown;
  latitude?: number | null;
  longitude?: number | null;
  geometry?: unknown;
}) {
  const coordinates = (waterBody.coordinates ?? {}) as WaterBodyCoordinates;
  const latitude = typeof waterBody.latitude === "number"
      ? waterBody.latitude
      : typeof coordinates.latitude === "number"
      ? coordinates.latitude
      : typeof coordinates.lat === "number"
        ? coordinates.lat
        : null;
  const longitude = typeof waterBody.longitude === "number"
      ? waterBody.longitude
      : typeof coordinates.longitude === "number"
      ? coordinates.longitude
      : typeof coordinates.lng === "number"
        ? coordinates.lng
        : null;

  return {
    id: waterBody.id,
    name: waterBody.name,
    type: waterBody.type,
    latitude,
    longitude,
    geometry: waterBody.geometry ?? coordinates.geometry ?? null,
  };
}

export default async function MapPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const severity = sp.severity && SEVERITIES.includes(sp.severity as never) ? sp.severity : undefined;
  const status = sp.status && INCIDENT_STATUSES.includes(sp.status as never) ? sp.status : undefined;
  const pollutionType = sp.pollutionType || undefined;
  const waterBodyId = sp.waterBodyId || undefined;

  const where = {
    ...(severity ? { severity: severity as never } : {}),
    ...(status ? { status: status as never } : {}),
    ...(pollutionType ? { pollutionType } : {}),
    ...(waterBodyId ? { waterBodyId } : {}),
  };

  const canManageMonitoring = session.user.role === "AUTHORITY" || session.user.role === "ADMIN";
  const [incidents, waterBodies, riskWaterBodies, satelliteAlerts, monitoringLocations] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: { reportedAt: "desc" },
      select: {
        id: true,
        title: true,
        latitude: true,
        longitude: true,
        severity: true,
        status: true,
        pollutionType: true,
        reportedAt: true,
        waterBody: { select: { name: true } },
      },
    }),
    prisma.waterBody.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, coordinates: true },
    }),
    prisma.waterBody.findMany({
      take: 5,
      orderBy: { incidents: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        type: true,
        coordinates: true,
        _count: { select: { incidents: true } },
        incidents: {
          take: 1,
          orderBy: { severity: "desc" },
          select: { severity: true },
        },
      },
    }),
    prisma.alert.findMany({
      where: {
        type: "SATELLITE_ALERT",
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        message: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
    }),
    canManageMonitoring
      ? prisma.satelliteMonitoring.findMany({
          where: { status: "ACTIVE" },
          select: {
            id: true,
            latitude: true,
            longitude: true,
            latestRiskLevel: true,
            latestWaterAreaKm2: true,
            latestChangePercent: true,
            latestObservationDate: true,
            waterBody: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const mapItems = incidents.map((i) => ({
    id: i.id,
    title: i.title,
    latitude: i.latitude,
    longitude: i.longitude,
    severity: i.severity,
    status: i.status,
  }));

  const satAlerts = satelliteAlerts
    .filter((a) => a.latitude !== null && a.longitude !== null)
    .map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      latitude: a.latitude!,
      longitude: a.longitude!,
      createdAt: a.createdAt.toISOString(),
    }));
  const monitorMarkers = monitoringLocations.map((monitor) => ({
    id: monitor.id,
    name: monitor.waterBody.name,
    latitude: monitor.latitude,
    longitude: monitor.longitude,
    riskLevel: monitor.latestRiskLevel,
    latestWaterAreaKm2: monitor.latestWaterAreaKm2,
    latestChangePercent: monitor.latestChangePercent,
    latestObservationDate: monitor.latestObservationDate?.toISOString() ?? null,
  }));
  const waterBodyMarkers = waterBodies.map((waterBody) => waterBodyMapData(waterBody));

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Water Map</h1>
          <p className="text-sm text-muted-foreground">
            {incidents.length} incidents across water bodies.
          </p>
        </div>
        <MapLegend />
      </div>

      <Card className="pb-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <IncidentFilters waterBodies={waterBodies} />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 h-full min-h-0">
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle className="text-base">Incident Map</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 px-6 pb-6">
            <div className="h-full rounded-lg overflow-hidden border">
              <IncidentMapClient
                incidents={mapItems}
                satelliteAlerts={satAlerts}
                monitoringLocations={monitorMarkers}
                waterBodies={waterBodyMarkers}
                selectedWaterBodyId={waterBodyId}
                height="100%"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 overflow-hidden">
          <Card className="flex flex-col overflow-hidden flex-1">
            <CardHeader className="shrink-0">
              <CardTitle className="text-base">Incident List</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <Link
                    key={incident.id}
                    href={`/incidents/${incident.id}`}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors block"
                  >
                    <div className="mt-0.5 shrink-0">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{incident.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {incident.waterBody?.name ?? `${incident.latitude.toFixed(2)}, ${incident.longitude.toFixed(2)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <SeverityBadge severity={incident.severity as Severity} />
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(incident.reportedAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                {incidents.length === 0 && (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No incidents to display.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Droplets className="h-4 w-4" /> Top Risk Water Bodies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riskWaterBodies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No water bodies recorded.</p>
              ) : (
                <div className="space-y-3">
                  {riskWaterBodies.map((wb) => (
                    <Link key={wb.id} href={`/map?waterBodyId=${encodeURIComponent(wb.id)}`} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{wb.name}</p>
                        <p className="text-xs text-muted-foreground">{WATER_BODY_TYPES[wb.type]}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {wb.incidents[0] && (
                          <SeverityBadge severity={wb.incidents[0].severity as Severity} />
                        )}
                        <span className="text-xs font-medium">{wb._count.incidents} incidents</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
