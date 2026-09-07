"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  MapPin,
  Plus,
  RefreshCw,
  Satellite,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MONITORING_STATUS_CONFIG,
  RISK_LEVEL_CONFIG,
  WATER_BODY_TYPES,
} from "@/lib/constants";
import { formatDateOnly, formatRelativeTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Scan = {
  id: string;
  observationDate: string;
  previousObservationDate: string | null;
  waterAreaKm2: number;
  previousWaterAreaKm2: number | null;
  changePercent: number;
  riskLevel: string;
  cloudCoverage: number | null;
  dataSource: string;
  alertCreated: boolean;
  status: string;
  errorMessage: string | null;
  productId: string | null;
  productTitle: string | null;
  waterPixels: number | null;
  totalPixels: number | null;
  pixelAreaKm2: number | null;
  ndwiImageRef: string | null;
  rgbImageRef: string | null;
  createdAt: string;
};

type Monitor = {
  id: string;
  waterBody: { id: string; name: string; type: string };
  latitude: number;
  longitude: number;
  status: string;
  lastCheckedAt: string | null;
  latestObservationDate: string | null;
  latestWaterAreaKm2: number | null;
  latestChangePercent: number | null;
  latestRiskLevel: string | null;
  previousWaterAreaKm2: number | null;
  scans: Scan[];
};

type Props = {
  monitors: Monitor[];
  satelliteConfigured: boolean;
  renderedAt: number;
};

type MonitoringForm = {
  name: string;
  type: string;
  description: string;
  latitude: string;
  longitude: string;
  bboxNorth: string;
  bboxSouth: string;
  bboxEast: string;
  bboxWest: string;
  thresholdWatch: string;
  thresholdHigh: string;
  thresholdCritical: string;
};

const DEFAULT_MONITORING_FORM: MonitoringForm = {
  name: "Indus River (Darya-e-Sindh)",
  type: "RIVER",
  description: "",
  latitude: "27.7032",
  longitude: "68.8570",
  bboxNorth: "27.90",
  bboxSouth: "27.50",
  bboxEast: "69.10",
  bboxWest: "68.60",
  thresholdWatch: "10",
  thresholdHigh: "20",
  thresholdCritical: "35",
};

export function MonitoringDashboard({
  monitors,
  satelliteConfigured,
  renderedAt,
}: Props) {
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddingMonitor, setIsAddingMonitor] = useState(false);
  const [monitoringForm, setMonitoringForm] = useState<MonitoringForm>(
    DEFAULT_MONITORING_FORM
  );
  const [isPending, startTransition] = useTransition();
  const [currentTime, setCurrentTime] = useState(renderedAt);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());
    const intervalId = window.setInterval(updateCurrentTime, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const updateMonitoringForm = (field: keyof MonitoringForm, value: string) => {
    setMonitoringForm((current) => ({ ...current, [field]: value }));
  };

  const handleAddMonitoringArea = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAddingMonitor(true);
    startTransition(async () => {
      try {
        const res = await fetch("/api/monitoring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...monitoringForm,
            description: monitoringForm.description || undefined,
            latitude: Number(monitoringForm.latitude),
            longitude: Number(monitoringForm.longitude),
            bboxNorth: Number(monitoringForm.bboxNorth),
            bboxSouth: Number(monitoringForm.bboxSouth),
            bboxEast: Number(monitoringForm.bboxEast),
            bboxWest: Number(monitoringForm.bboxWest),
            thresholdWatch: Number(monitoringForm.thresholdWatch),
            thresholdHigh: Number(monitoringForm.thresholdHigh),
            thresholdCritical: Number(monitoringForm.thresholdCritical),
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(
            err.error?.details?.[0]?.message ??
              err.error?.message ??
              "Could not add monitoring area"
          );
        }

        const { data } = await res.json();
        toast.success(`${data.waterBody.name} monitoring area added.`);
        setIsAddDialogOpen(false);
        setMonitoringForm(DEFAULT_MONITORING_FORM);
        window.location.reload();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not add monitoring area"
        );
      } finally {
        setIsAddingMonitor(false);
      }
    });
  };

  const handleScan = (monitoringId: string, observationDate?: string) => {
    setScanningId(monitoringId);
    const progressMessages = [
      "Searching Sentinel-2 imagery...",
      "Downloading satellite bands...",
      "Calculating water extent...",
      "Comparing with previous observation...",
      "Generating anomaly assessment...",
      "Creating alert/investigation if required...",
    ];
    let progressIndex = 0;
    setScanProgress(progressMessages[progressIndex]);
    const progressTimer = window.setInterval(() => {
      progressIndex = Math.min(progressIndex + 1, progressMessages.length - 1);
      setScanProgress(progressMessages[progressIndex]);
    }, 2500);
    startTransition(async () => {
      try {
        const res = await fetch("/api/monitoring/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monitoringId, observationDate }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? "Scan failed");
        }

        const { data } = await res.json();

        if (data.status === "NO_DATA") {
          toast.info(
            data.lastObservationDate
              ? `No newer cloud-free Sentinel-2 observation is available since ${formatDateOnly(data.lastObservationDate)}. Previous observations remain available in Scan history below.`
              : "No suitable Sentinel-2 observation is available for this monitoring area yet. Any previous observations remain available in Scan history below."
          );
        }  else if (data.riskLevel === "NORMAL") {
          toast.success(
            `Scan complete — ${data.waterBodyName}: ${data.riskLevel} (${data.changePercent.toFixed(1)}%)`
          );
        } else {
          toast.info(
            `Scan complete — ${data.waterBodyName}: ${data.riskLevel} (${data.changePercent.toFixed(1)}%)`
          );
        }

        window.location.reload();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Scan failed. Try again."
        );
      } finally {
        window.clearInterval(progressTimer);
        setScanProgress("");
        setScanningId(null);
      }
    });
  };

  const activeMonitors = monitors.filter((m) => m.status === "ACTIVE");
  const criticalOrHigh = monitors.filter(
    (m) =>
      m.latestRiskLevel === "CRITICAL" || m.latestRiskLevel === "HIGH"
  );
  const latestLastCheckedAt = monitors.reduce<number | null>((latest, monitor) => {
    if (!monitor.lastCheckedAt) return latest;

    const timestamp = new Date(monitor.lastCheckedAt).getTime();
    if (!Number.isFinite(timestamp)) return latest;

    return latest === null ? timestamp : Math.max(latest, timestamp);
  }, null);

  return (
    <div className="mx-auto max-w-7xl space-y-6 lg:space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#0b6972]/10 bg-[#0b2d37] px-6 py-7 text-white shadow-[0_22px_45px_-32px_rgba(8,35,45,0.58)] sm:px-8 sm:py-9">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_15%,rgba(94,234,212,0.22),transparent_23%),radial-gradient(circle_at_64%_100%,rgba(14,116,144,0.28),transparent_30%)]" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">
              Satellite monitoring
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Water Change Detection
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              Monitor water body extent using Sentinel-2 satellite imagery.
              Abnormal decreases trigger automatic alerts for investigation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "border-white/20 text-xs",
                satelliteConfigured
                  ? "text-teal-300"
                  : "text-amber-300"
              )}
            >
              {satelliteConfigured
                ? "Copernicus Connected"
                : "Simulation Mode"}
            </Badge>
            <Button
              type="button"
              size="sm"
              className="bg-white text-[#0b2d37] hover:bg-slate-100"
              disabled={isAddingMonitor || isPending}
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Monitoring Area
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active monitors
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#173b45]">
                  {activeMonitors.length}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-primary">
                <Satellite className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {monitors.length} total configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  High/Critical alerts
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#173b45]">
                  {criticalOrHigh.length}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Require investigation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Last scan
                </p>
                <p className="mt-3 text-lg font-semibold tracking-tight text-[#173b45]">
                  {latestLastCheckedAt !== null
                    ? formatRelativeTime(latestLastCheckedAt, currentTime)
                    : "Never"}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <RefreshCw className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Most recent observation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Data source
                </p>
                <p className="mt-3 text-lg font-semibold tracking-tight text-[#173b45]">
                  Sentinel-2 L2A
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <MapPin className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Copernicus Data Space
            </p>
          </CardContent>
        </Card>
      </section>

      {monitors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Satellite className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              No monitoring areas configured.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use Add Monitoring Area to define the location and scan boundary manually.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {monitors.map((monitor) => (
            <MonitorCard
              key={monitor.id}
              monitor={monitor}
              isScanning={scanningId === monitor.id}
              scanProgress={scanProgress}
              isAnyScanning={isPending}
              satelliteConfigured={satelliteConfigured}
              onScan={handleScan}
            />
          ))}
        </div>
      )}

      {monitors.some((m) => m.scans.length > 0) && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-5">
            <CardTitle className="text-lg">Scan history</CardTitle>
            <CardDescription>
              Latest and previous satellite observations across all monitored water bodies
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Water body
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Water area
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Change
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Risk
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Product / pixels
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Alert
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monitors
                    .flatMap((m) =>
                      m.scans.map((s) => ({
                        ...s,
                        waterBodyName: m.waterBody.name,
                      }))
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                    .slice(0, 20)
                    .map((scan) => {
                      const riskConfig =
                        RISK_LEVEL_CONFIG[
                          scan.riskLevel as keyof typeof RISK_LEVEL_CONFIG
                        ];
                      return (
                        <tr
                          key={scan.id}
                          className="border-b last:border-b-0 hover:bg-muted/20"
                        >
                          <td className="px-4 py-3 font-medium">
                            {scan.waterBodyName}
                            
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDateOnly(scan.observationDate)}
                          </td>
                          <td className="px-4 py-3">
                            {scan.status === "COMPLETED" ? (
                              <>
                                {scan.waterAreaKm2.toFixed(1)} km²
                                {scan.previousWaterAreaKm2 !== null && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    (prev: {scan.previousWaterAreaKm2.toFixed(1)})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {scan.status === "COMPLETED" ? (
                              <span
                                className={cn(
                                  "font-medium",
                                  scan.changePercent < -10
                                    ? "text-red-600"
                                    : scan.changePercent < 0
                                      ? "text-amber-600"
                                      : "text-green-600"
                                )}
                              >
                                {scan.changePercent > 0 ? "+" : ""}
                                {scan.changePercent.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {scan.status === "COMPLETED" && riskConfig ? (
                              <Badge
                                variant="outline"
                                className={cn("text-[10px]", riskConfig.color)}
                              >
                                {riskConfig.label}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="max-w-[260px] px-4 py-3 text-xs text-muted-foreground">
                            <p className="truncate" title={scan.dataSource}>
                              {scan.dataSource}
                            </p>
                            {scan.status !== "COMPLETED" && scan.errorMessage && (
                              <p className="mt-1 line-clamp-2 text-red-600" title={scan.errorMessage}>
                                {scan.errorMessage}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {scan.status === "COMPLETED" && scan.productId ? (
                              <span title={scan.productId}>
                                {scan.productTitle ?? scan.productId.slice(0, 18)}
                                {scan.waterPixels !== null && scan.totalPixels !== null && (
                                  <span className="block mt-1">
                                    {scan.waterPixels.toLocaleString()} / {scan.totalPixels.toLocaleString()} water pixels
                                  </span>
                                )}
                                    <a
                                      className="block mt-1 text-primary hover:underline"
                                      href={`/api/monitoring/scans/${scan.id}/preview`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Open RGB preview
                                    </a>
                              </span>
                            ) : "--"}
                          </td>
                          <td className="px-4 py-3">
                            {scan.alertCreated ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-orange-700 bg-orange-50 border-orange-200"
                              >
                                Alert sent
                              </Badge>
                            ) : scan.status === "FAILED" ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-red-600 bg-red-50 border-red-200"
                              >
                                Failed
                              </Badge>
                            ) : scan.status === "NO_DATA" ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-amber-700 bg-amber-50 border-amber-200"
                              >
                                No imagery
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                --
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Monitoring Area</DialogTitle>
            <DialogDescription>
              Define a water body, its location, and the satellite scan boundary.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleAddMonitoringArea}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="monitoring-name">Area name</Label>
                <Input
                  id="monitoring-name"
                  required
                  value={monitoringForm.name}
                  onChange={(event) => updateMonitoringForm("name", event.target.value)}
                  placeholder="Indus River (Darya-e-Sindh)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monitoring-type">Water body type</Label>
                <Select
                  id="monitoring-type"
                  value={monitoringForm.type}
                  onChange={(event) => updateMonitoringForm("type", event.target.value)}
                >
                  {Object.entries(WATER_BODY_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monitoring-description">Description</Label>
                <Textarea
                  id="monitoring-description"
                  className="min-h-10"
                  value={monitoringForm.description}
                  onChange={(event) => updateMonitoringForm("description", event.target.value)}
                  placeholder="Optional context for this monitoring area"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Location</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monitoring-latitude">Latitude</Label>
                  <Input
                    id="monitoring-latitude"
                    type="number"
                    step="any"
                    required
                    value={monitoringForm.latitude}
                    onChange={(event) => updateMonitoringForm("latitude", event.target.value)}
                    placeholder="27.7032"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monitoring-longitude">Longitude</Label>
                  <Input
                    id="monitoring-longitude"
                    type="number"
                    step="any"
                    required
                    value={monitoringForm.longitude}
                    onChange={(event) => updateMonitoringForm("longitude", event.target.value)}
                    placeholder="68.8570"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Satellite scan boundary</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monitoring-north">North</Label>
                  <Input
                    id="monitoring-north"
                    type="number"
                    step="any"
                    required
                    value={monitoringForm.bboxNorth}
                    onChange={(event) => updateMonitoringForm("bboxNorth", event.target.value)}
                    placeholder="27.90"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monitoring-south">South</Label>
                  <Input
                    id="monitoring-south"
                    type="number"
                    step="any"
                    required
                    value={monitoringForm.bboxSouth}
                    onChange={(event) => updateMonitoringForm("bboxSouth", event.target.value)}
                    placeholder="27.50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monitoring-east">East</Label>
                  <Input
                    id="monitoring-east"
                    type="number"
                    step="any"
                    required
                    value={monitoringForm.bboxEast}
                    onChange={(event) => updateMonitoringForm("bboxEast", event.target.value)}
                    placeholder="69.10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monitoring-west">West</Label>
                  <Input
                    id="monitoring-west"
                    type="number"
                    step="any"
                    required
                    value={monitoringForm.bboxWest}
                    onChange={(event) => updateMonitoringForm("bboxWest", event.target.value)}
                    placeholder="68.60"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Water decrease thresholds (%)</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="monitoring-watch">Watch</Label>
                  <Input
                    id="monitoring-watch"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    required
                    value={monitoringForm.thresholdWatch}
                    onChange={(event) => updateMonitoringForm("thresholdWatch", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monitoring-high">High</Label>
                  <Input
                    id="monitoring-high"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    required
                    value={monitoringForm.thresholdHigh}
                    onChange={(event) => updateMonitoringForm("thresholdHigh", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monitoring-critical">Critical</Label>
                  <Input
                    id="monitoring-critical"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    required
                    value={monitoringForm.thresholdCritical}
                    onChange={(event) => updateMonitoringForm("thresholdCritical", event.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isAddingMonitor}
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 text-white hover:bg-teal-700"
                disabled={isAddingMonitor || isPending}
              >
                {isAddingMonitor ? "Adding..." : "Add Monitoring Area"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getDistinctPreviewScans(scans: Scan[]): Scan[] {
  return Array.from(
    new Map(
      scans
        .filter((scan) => scan.status === "COMPLETED" && scan.rgbImageRef)
        .sort(
          (a, b) =>
            new Date(b.observationDate).getTime() -
            new Date(a.observationDate).getTime()
        )
        .map((scan) => [
          new Date(scan.observationDate).toISOString().slice(0, 10),
          scan,
        ])
    ).values()
  ).slice(0, 2);
}

function MonitorCard({
  monitor,
  isScanning,
  scanProgress,
  isAnyScanning,
  satelliteConfigured,
  onScan,
}: {
  monitor: Monitor;
  isScanning: boolean;
  scanProgress: string;
  isAnyScanning: boolean;
  satelliteConfigured: boolean;
  onScan: (id: string, observationDate?: string) => void;
}) {
  const [selectedObservationDate, setSelectedObservationDate] = useState("");
  const statusConfig =
    MONITORING_STATUS_CONFIG[
      monitor.status as keyof typeof MONITORING_STATUS_CONFIG
    ];
  const riskConfig = monitor.latestRiskLevel
    ? RISK_LEVEL_CONFIG[
        monitor.latestRiskLevel as keyof typeof RISK_LEVEL_CONFIG
      ]
    : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{monitor.waterBody.name}</CardTitle>
            {statusConfig && (
              <Badge variant="outline" className={cn("text-[10px]", statusConfig.color)}>
                {statusConfig.label}
              </Badge>
            )}
          </div>
          <CardDescription className="mt-1">
            {monitor.waterBody.type} &middot;{" "}
            {monitor.latitude.toFixed(2)}, {monitor.longitude.toFixed(2)}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            disabled={isScanning || isAnyScanning}
            onClick={() => onScan(monitor.id)}
            className="bg-teal-600 text-white hover:bg-teal-700"
          >
            {isScanning ? (
              <>
                <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Satellite className="mr-2 h-3.5 w-3.5" />
                Run Satellite Scan
              </>
            )}
          </Button>
          <input
            type="date"
            value={selectedObservationDate}
            onChange={(event) => setSelectedObservationDate(event.target.value)}
            disabled={isScanning || isAnyScanning}
            max={new Date().toISOString().slice(0, 10)}
            aria-label={`Select an observation date for ${monitor.waterBody.name}`}
            className="h-9 rounded-md border bg-background px-2 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedObservationDate || isScanning || isAnyScanning}
            onClick={() => onScan(monitor.id, selectedObservationDate)}
          >
            Check previous scan
          </Button>
          {/* <Button
            size="sm"
            variant="outline"
            disabled={isScanning || isAnyScanning}
            onClick={() => onScan(monitor.id, true)}
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <TestTube2 className="mr-2 h-3.5 w-3.5" />
            Simulate
          </Button> */}
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {isScanning && (
          <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
            {scanProgress || "Searching Sentinel-2 imagery..."}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Latest observation</p>
            <p className="mt-1 text-sm font-semibold">
              {monitor.latestObservationDate
                ? formatDateOnly(monitor.latestObservationDate)
                : "No data"}
            </p>
          </div>

          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Water area</p>
            <p className="mt-1 text-sm font-semibold">
              {monitor.latestWaterAreaKm2 !== null
                ? `${monitor.latestWaterAreaKm2.toFixed(1)} km²`
                : "--"}
            </p>
            {monitor.previousWaterAreaKm2 !== null && (
              <p className="text-[11px] text-muted-foreground">
                Previous: {monitor.previousWaterAreaKm2.toFixed(1)} km²
              </p>
            )}
          </div>

          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Water change</p>
            <p
              className={cn(
                "mt-1 text-sm font-semibold",
                monitor.latestChangePercent !== null &&
                  monitor.latestChangePercent < -10
                  ? "text-red-600"
                  : monitor.latestChangePercent !== null &&
                      monitor.latestChangePercent < 0
                    ? "text-amber-600"
                    : ""
              )}
            >
              {monitor.latestChangePercent !== null
                ? `${monitor.latestChangePercent > 0 ? "+" : ""}${monitor.latestChangePercent.toFixed(1)}%`
                : "--"}
            </p>
          </div>

          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Risk level</p>
            <div className="mt-1">
              {riskConfig ? (
                <Badge variant="outline" className={cn("text-xs", riskConfig.color)}>
                  {riskConfig.label}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">--</span>
              )}
            </div>
          </div>
        </div>

        {getDistinctPreviewScans(monitor.scans).length > 0 && (
           <div
             className={cn(
               "mt-5 grid w-full gap-4",
               getDistinctPreviewScans(monitor.scans).length > 1
                 ? "md:grid-cols-2"
                 : "md:grid-cols-1"
             )}
           >
             {getDistinctPreviewScans(monitor.scans)
               .map((scan, index) => (
                <div key={scan.id} className="min-w-0 w-full overflow-hidden rounded-xl border">
                  <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                    <p className="text-xs font-medium">
                      {index === 0 ? "After — latest RGB" : "Before — previous RGB"}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateOnly(scan.observationDate)}
                    </span>
                  </div>
                  <div className="satellite-preview-frame aspect-[3/2] w-full">
                    <img
                      src={`${scan.rgbImageRef!}&v=9`}
                      alt={`Sentinel-2 RGB imagery for ${monitor.waterBody.name}`}
                      className="satellite-preview"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-muted-foreground">
                    <span className="truncate" title={scan.productId ?? undefined}>
                      {scan.productTitle ?? scan.productId ?? "Sentinel-2 L2A"}
                    </span>
                    {scan.ndwiImageRef && (
                      <a
                        href={scan.ndwiImageRef}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-primary hover:underline"
                      >
                        NDWI
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {!satelliteConfigured && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Copernicus not configured
                </p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Set <code className="bg-amber-100 px-1 rounded">COPERNICUS_CLIENT_ID</code>{" "}
                  and <code className="bg-amber-100 px-1 rounded">COPERNICUS_CLIENT_SECRET</code>{" "}
                  in your environment to use real satellite data. Use the
                  &quot;Simulate&quot; button to test with mock data.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
