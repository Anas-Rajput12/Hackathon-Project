"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Map as MapboxMap, Marker } from "mapbox-gl";

type Props = {
  latitude: number;
  longitude: number;
  title: string;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAPBOX_STYLE = "mapbox://styles/mapbox/streets-v12";
const EMPTY_SATELLITE_ALERTS: {
  id: string;
  title: string;
  message: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}[] = [];
const EMPTY_MONITORING_LOCATIONS: {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  riskLevel?: string | null;
  latestWaterAreaKm2?: number | null;
  latestChangePercent?: number | null;
  latestObservationDate?: string | null;
}[] = [];
const EMPTY_WATER_BODIES: {
  id: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  geometry: unknown;
}[] = [];

export function LocationPreview({ latitude, longitude, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    if (!MAPBOX_TOKEN) return;
    import("mapbox-gl")
      .then(async (mod) => {
        if (cancelled) return;
        await import("mapbox-gl/dist/mapbox-gl.css");
        const mapboxgl = mod.default;

        mapboxgl.accessToken = MAPBOX_TOKEN;
        const map = new mapboxgl.Map({
          container: containerRef.current!,
          style: MAPBOX_STYLE,
          center: [longitude, latitude],
          zoom: 12,
          interactive: false,
        });

        new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat([longitude, latitude])
          .addTo(map);

        mapRef.current = map;
      })
      .catch((error) => console.error("Failed to load Mapbox preview", error));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude]);

  return (
    <div className="relative rounded-lg overflow-hidden border">
      <div ref={containerRef} className="h-64 sm:h-80 w-full" />
      <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur rounded-md px-2 py-1 text-xs flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {title}
        </Badge>
        <span className="font-mono">
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

export function IncidentMap({
  incidents,
  satelliteAlerts,
  monitoringLocations,
  waterBodies,
  selectedWaterBodyId,
  onMarkerClick,
  onSatelliteMarkerClick,
  onMonitoringMarkerClick,
  height = "100%",
}: {
  incidents: {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    severity: string;
    status: string;
  }[];
  satelliteAlerts?: {
    id: string;
    title: string;
    message: string;
    latitude: number;
    longitude: number;
    createdAt: string;
  }[];
  monitoringLocations?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    riskLevel?: string | null;
    latestWaterAreaKm2?: number | null;
    latestChangePercent?: number | null;
    latestObservationDate?: string | null;
  }[];
  waterBodies?: {
    id: string;
    name: string;
    type: string;
    latitude: number | null;
    longitude: number | null;
    geometry: unknown;
  }[];
  selectedWaterBodyId?: string;
  onMarkerClick?: (id: string) => void;
  onSatelliteMarkerClick?: (id: string) => void;
  onMonitoringMarkerClick?: (id: string) => void;
  height?: string;
}) {
  const resolvedSatelliteAlerts = satelliteAlerts ?? EMPTY_SATELLITE_ALERTS;
  const resolvedMonitoringLocations = monitoringLocations ?? EMPTY_MONITORING_LOCATIONS;
  const resolvedWaterBodies = waterBodies ?? EMPTY_WATER_BODIES;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    if (!MAPBOX_TOKEN) return;
    import("mapbox-gl")
      .then(async (mod) => {
        if (cancelled) return;
        await import("mapbox-gl/dist/mapbox-gl.css");
        const mapboxgl = mod.default;
        mapboxgl.accessToken = MAPBOX_TOKEN;

        const allPoints = [
          ...incidents.map((i) => ({ lat: i.latitude, lng: i.longitude })),
          ...resolvedSatelliteAlerts.map((a) => ({ lat: a.latitude, lng: a.longitude })),
          ...resolvedMonitoringLocations.map((m) => ({ lat: m.latitude, lng: m.longitude })),
          ...resolvedWaterBodies
            .filter((w) => w.latitude !== null && w.longitude !== null)
            .map((w) => ({ lat: w.latitude!, lng: w.longitude! })),
        ];
        const waterBodyPoints = resolvedWaterBodies
          .filter((w) => w.latitude !== null && w.longitude !== null)
          .map((w) => ({ lat: w.latitude!, lng: w.longitude! }));
        const selectedWaterBody = selectedWaterBodyId
          ? resolvedWaterBodies.find((waterBody) => waterBody.id === selectedWaterBodyId)
          : null;
        const initialPoint = selectedWaterBody?.latitude !== null && selectedWaterBody?.latitude !== undefined &&
          selectedWaterBody.longitude !== null && selectedWaterBody.longitude !== undefined
          ? { lat: selectedWaterBody.latitude, lng: selectedWaterBody.longitude }
          : waterBodyPoints[0] ?? allPoints[0];

        const map = new mapboxgl.Map({
          container: containerRef.current!,
          style: MAPBOX_STYLE,
          center: initialPoint
            ? [initialPoint.lng, initialPoint.lat]
            : [0, 0],
          zoom: initialPoint ? 8 : 2,
        });

        map.addControl(new mapboxgl.NavigationControl(), "top-right");
        mapRef.current = map;
        setMapReady(true);

        map.on("load", () => {
          const lineWaterBodies = resolvedWaterBodies.filter((w) => w.geometry);
          lineWaterBodies.forEach((waterBody) => {
            const sourceId = `water-body-${waterBody.id}`;
            map.addSource(sourceId, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: { name: waterBody.name },
                geometry: waterBody.geometry as GeoJSON.Geometry,
              },
            });
            map.addLayer({
              id: `${sourceId}-line`,
              type: "line",
              source: sourceId,
              paint: {
                "line-color": "#0284c7",
                "line-width": 5,
                "line-opacity": 0.85,
              },
            });
          });

          if (selectedWaterBody?.latitude !== null && selectedWaterBody?.latitude !== undefined &&
            selectedWaterBody.longitude !== null && selectedWaterBody.longitude !== undefined) {
            map.flyTo({
              center: [selectedWaterBody.longitude, selectedWaterBody.latitude],
              zoom: selectedWaterBody.name.toLowerCase().includes("nara canal") ? 13 : 12,
              essential: true,
            });
          } else if (waterBodyPoints.length === 1) {
            map.flyTo({ center: [waterBodyPoints[0].lng, waterBodyPoints[0].lat], zoom: 11, essential: true });
          } else if (waterBodyPoints.length > 1) {
            const waterBodyBounds = new mapboxgl.LngLatBounds();
            waterBodyPoints.forEach((point) => waterBodyBounds.extend([point.lng, point.lat]));
            map.fitBounds(waterBodyBounds, { padding: 80, maxZoom: 11, essential: true });
          }
        });

      })
      .catch((error) => console.error("Failed to load Mapbox map", error));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map only initializes once
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!MAPBOX_TOKEN) return;
    import("mapbox-gl")
      .then((mod) => {
        const mapboxgl = mod.default;

        const incidentMarkers = incidents.map((i) => {
          const el = document.createElement("div");
          el.className = "incident-marker";
          const color = severityColor(i.severity);
          el.style.width = "22px";
          el.style.height = "22px";
          el.style.borderRadius = "50%";
          el.style.background = color;
          el.style.border = "3px solid white";
          el.style.boxShadow =
            "0 0 0 1px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.25)";
          el.style.cursor = "pointer";
          el.title = i.title;

          const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(
            `<div class="p-2 min-w-[10rem]">
              <p class="text-sm font-medium">${escapeHtml(i.title)}</p>
              <p class="text-xs text-muted-foreground mt-0.5">
                ${escapeHtml(i.severity)} · ${escapeHtml(i.status)}
              </p>
              ${
                onMarkerClick
                  ? `<button class="text-primary text-xs mt-2 underline" data-incident-id="${escapeHtml(
                      i.id
                    )}">View details →</button>`
                  : ""
              }
            </div>`
          );

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([i.longitude, i.latitude])
            .setPopup(popup)
            .addTo(map);

          el.addEventListener("click", () => onMarkerClick?.(i.id));
          return marker;
        });

        const satMarkers = resolvedSatelliteAlerts.map((a) => {
          const el = document.createElement("div");
          el.className = "satellite-marker";
          el.style.width = "24px";
          el.style.height = "24px";
          el.style.borderRadius = "4px";
          el.style.background = "#0891b2";
          el.style.border = "3px solid white";
          el.style.boxShadow =
            "0 0 0 1px rgba(0,0,0,0.2), 0 2px 6px rgba(8,145,178,0.4)";
          el.style.cursor = "pointer";
          el.style.transform = "rotate(45deg)";
          el.title = a.title;

          const dateStr = new Date(a.createdAt).toLocaleDateString();
          const popup = new mapboxgl.Popup({ offset: 14 }).setHTML(
            `<div class="p-2 min-w-[12rem]">
              <p class="text-sm font-semibold text-cyan-700">${escapeHtml(a.title)}</p>
              <p class="text-xs text-muted-foreground mt-1">${escapeHtml(a.message.slice(0, 150))}</p>
              <p class="text-[11px] text-muted-foreground mt-2">${escapeHtml(dateStr)}</p>
            </div>`
          );

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([a.longitude, a.latitude])
            .setPopup(popup)
            .addTo(map);

          el.addEventListener("click", () => onSatelliteMarkerClick?.(a.id));
          return marker;
        });

        const monitoringMarkers = resolvedMonitoringLocations.map((location) => {
          const el = document.createElement("div");
          el.className = "monitoring-marker";
          el.style.width = "18px";
          el.style.height = "18px";
          el.style.borderRadius = "50%";
          el.style.background = riskColor(location.riskLevel);
          el.style.border = "3px solid white";
          el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.2), 0 2px 5px rgba(0,0,0,0.22)";
          el.style.cursor = "pointer";
          el.title = location.name;

          const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(
            `<div class="p-2 min-w-[11rem]">
              <p class="text-sm font-semibold">${escapeHtml(location.name)}</p>
              <p class="text-xs text-muted-foreground mt-1">${escapeHtml(location.riskLevel ?? "No scan")}</p>
              <p class="text-xs text-muted-foreground mt-1">${location.latestWaterAreaKm2 == null ? "Water area unavailable" : `${location.latestWaterAreaKm2.toFixed(2)} km²`} · ${location.latestChangePercent == null ? "Change unavailable" : `${location.latestChangePercent.toFixed(1)}%`}</p>
              <p class="text-[11px] text-muted-foreground mt-1">${location.latestObservationDate ? escapeHtml(new Date(location.latestObservationDate).toLocaleDateString()) : "No satellite scan yet"}</p>
              ${
                onMonitoringMarkerClick
                  ? `<button class="text-primary text-xs mt-2 underline" data-monitoring-id="${escapeHtml(location.id)}">View investigation →</button>`
                  : ""
              }
            </div>`
          );

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([location.longitude, location.latitude])
            .setPopup(popup)
            .addTo(map);

          el.addEventListener("click", () => onMonitoringMarkerClick?.(location.id));
          return marker;
        });

        const waterBodyMarkers = resolvedWaterBodies
          .filter((waterBody) => waterBody.latitude !== null && waterBody.longitude !== null)
          .map((waterBody) => {
            const el = document.createElement("div");
            el.className = "water-body-marker";
            el.style.width = "16px";
            el.style.height = "16px";
            el.style.borderRadius = "50%";
            el.style.background = "#0369a1";
            el.style.border = "3px solid white";
            el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.2), 0 2px 5px rgba(3,105,161,0.35)";
            el.style.cursor = "pointer";
            el.title = waterBody.name;

            const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(
              `<div class="p-2 min-w-[11rem]">
                <p class="text-sm font-semibold">${escapeHtml(waterBody.name)}</p>
                <p class="text-xs text-muted-foreground mt-1">${escapeHtml(waterBody.type)}</p>
                <p class="text-[11px] text-muted-foreground mt-1">${waterBody.latitude!.toFixed(4)}, ${waterBody.longitude!.toFixed(4)}</p>
              </div>`
            );

            return new mapboxgl.Marker({ element: el })
              .setLngLat([waterBody.longitude!, waterBody.latitude!])
              .setPopup(popup)
              .addTo(map);
          });

        markersRef.current = [...incidentMarkers, ...satMarkers, ...monitoringMarkers, ...waterBodyMarkers];

        resolvedWaterBodies.forEach((waterBody) => {
          if (waterBody.latitude === null || waterBody.longitude === null) return;
          const marker = waterBodyMarkers.find((candidate) => candidate.getElement().title === waterBody.name);
          marker?.getElement().addEventListener("click", () => {
            map.flyTo({
              center: [waterBody.longitude!, waterBody.latitude!],
              zoom: waterBody.name.toLowerCase().includes("nara canal") ? 13 : 12,
              essential: true,
            });
          });
        });
      })
      .catch((error) => console.error("Failed to render Mapbox markers", error));
  }, [mapReady, incidents, resolvedSatelliteAlerts, resolvedMonitoringLocations, resolvedWaterBodies, selectedWaterBodyId, onMarkerClick, onSatelliteMarkerClick, onMonitoringMarkerClick]);

  useEffect(() => {
    if (!mapRef.current || !selectedWaterBodyId) return;
    const selected = resolvedWaterBodies.find((waterBody) => waterBody.id === selectedWaterBodyId);
    if (selected?.latitude === null || selected?.latitude === undefined || selected.longitude === null || selected.longitude === undefined) return;
    mapRef.current.flyTo({
      center: [selected.longitude, selected.latitude],
      zoom: selected.name.toLowerCase().includes("nara canal") ? 13 : 12,
      essential: true,
    });
  }, [selectedWaterBodyId, resolvedWaterBodies]);

  return (
    <div className="relative w-full rounded-lg" style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />
      {resolvedWaterBodies.some((waterBody) => waterBody.latitude === null || waterBody.longitude === null) && (
        <div className="absolute bottom-3 left-3 rounded-md bg-background/90 px-3 py-2 text-xs shadow">
          Location unavailable for {resolvedWaterBodies.filter((waterBody) => waterBody.latitude === null || waterBody.longitude === null).length} water body
          {resolvedWaterBodies.filter((waterBody) => waterBody.latitude === null || waterBody.longitude === null).length === 1 ? "" : "ies"}.
        </div>
      )}
    </div>
  );
}

function severityColor(severity: string): string {
  const map: Record<string, string> = {
    CRITICAL: "#dc2626",
    HIGH: "#ea580c",
    MEDIUM: "#ca8a04",
    LOW: "#16a34a",
  };
  return map[severity] ?? "#64748b";
}

function riskColor(riskLevel?: string | null): string {
  if (riskLevel === "CRITICAL") return "#dc2626";
  if (riskLevel === "HIGH") return "#ea580c";
  if (riskLevel === "WATCH") return "#facc15";
  return "#16a34a";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function MapLegend() {
  const items = [
    { severity: "Critical", color: "#dc2626" },
    { severity: "High", color: "#ea580c" },
    { severity: "Medium", color: "#ca8a04" },
    { severity: "Low", color: "#16a34a" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {items.map((i) => (
        <div key={i.severity} className="flex items-center gap-1.5">
          <span
            className={cn("h-3 w-3 rounded-full border-2 border-white shadow")}
            style={{ background: i.color }}
          />
          <span className="text-muted-foreground">{i.severity}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span
          className="h-3 w-3 border-2 border-white shadow"
          style={{ background: "#0891b2", borderRadius: "3px", transform: "rotate(45deg)" }}
        />
        <span className="text-muted-foreground">Satellite alert</span>
      </div>
    </div>
  );
}
