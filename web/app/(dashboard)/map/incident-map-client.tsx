"use client";

import { useRouter } from "next/navigation";
import { IncidentMap } from "@/components/incidents/location-preview";

type Incident = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  severity: string;
  status: string;
};

type MonitoringLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  riskLevel?: string | null;
  latestWaterAreaKm2?: number | null;
  latestChangePercent?: number | null;
  latestObservationDate?: string | null;
};

type SatelliteAlert = {
  id: string;
  title: string;
  message: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};

type WaterBody = {
  id: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  geometry: unknown;
};

export function IncidentMapClient({
  incidents,
  satelliteAlerts = [],
  monitoringLocations = [],
  waterBodies = [],
  selectedWaterBodyId,
  height = "100%",
}: {
  incidents: Incident[];
  satelliteAlerts?: SatelliteAlert[];
  monitoringLocations?: MonitoringLocation[];
  waterBodies?: WaterBody[];
  selectedWaterBodyId?: string;
  height?: string;
}) {
  const router = useRouter();

  return (
    <IncidentMap
      incidents={incidents}
      satelliteAlerts={satelliteAlerts}
      monitoringLocations={monitoringLocations}
      waterBodies={waterBodies}
      selectedWaterBodyId={selectedWaterBodyId}
      height={height}
      onMarkerClick={(id) => router.push(`/incidents/${id}`)}
      onSatelliteMarkerClick={() => router.push(`/alerts`)}
      onMonitoringMarkerClick={() => router.push("/monitoring")}
    />
  );
}
