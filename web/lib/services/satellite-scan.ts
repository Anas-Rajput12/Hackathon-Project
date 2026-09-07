import { prisma } from "@/lib/db";
import {
  fetchLatestObservation,
  fetchPreviousObservation,
  calculateChangePercent,
  assessRiskLevel,
  isCopernicusConfigured,
  SatelliteServiceError,
  type RiskLevelValue,
} from "./satellite";
import {
  auditSatelliteScanCompleted,
  auditSatelliteAlertCreated,
} from "./audit";

export class SatelliteScanError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "SatelliteScanError";
  }
}

type ScanResult = {
  scanId: string;
  monitoringId: string;
  waterBodyName: string;
  observationDate: Date;
  previousObservationDate: Date | null;
  waterAreaKm2: number;
  previousWaterAreaKm2: number | null;
  changePercent: number;
  riskLevel: RiskLevelValue;
  cloudCoverage: number | null;
  dataSource: string;
  isSimulation: boolean;
  alertCreated: boolean;
  lastObservationDate: Date | null;
  incidentCreated?: boolean;
  status: "COMPLETED" | "NO_DATA";
};

function toScanError(error: unknown): SatelliteScanError {
  if (error instanceof SatelliteServiceError) {
    return new SatelliteScanError(
      error.code,
      error.message,
      error.retryable ? 503 : 422
    );
  }
  return new SatelliteScanError(
    "COPERNICUS_SCAN_FAILED",
    "The live Copernicus scan could not be completed. Try again later.",
    502
  );
}

function aoiFor(monitoring: {
  bboxNorth: number;
  bboxSouth: number;
  bboxEast: number;
  bboxWest: number;
}) {
  return {
    north: monitoring.bboxNorth,
    south: monitoring.bboxSouth,
    east: monitoring.bboxEast,
    west: monitoring.bboxWest,
  };
}

async function createSatelliteIncident(
  monitoring: {
    id: string;
    latitude: number;
    longitude: number;
    waterBodyId: string;
    waterBody: { name: string };
  },
  scanId: string,
  riskLevel: "HIGH" | "CRITICAL",
  changePercent: number,
  previousWaterAreaKm2: number,
  currentWaterAreaKm2: number
): Promise<boolean> {
  const existing = await prisma.incident.findUnique({
    where: { satelliteScanId: scanId },
    select: { id: true },
  });
  if (existing) return false;

  const reporter = await prisma.user.findFirst({
    where: { role: { in: ["AUTHORITY", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!reporter) return false;

  const severity = riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH";
  const title = `Satellite water loss detected — ${monitoring.waterBody.name}`;
  const description =
    `Sentinel-2 detected a ${Math.abs(changePercent).toFixed(1)}% decrease ` +
    `in observed water extent for ${monitoring.waterBody.name}, from ` +
    `${previousWaterAreaKm2.toFixed(2)} km² to ${currentWaterAreaKm2.toFixed(2)} km². ` +
    "This automatically detected incident requires field verification.";

  await prisma.incident.create({
    data: {
      title,
      description,
      pollutionType: "Water loss",
      severity,
      status: "DETECTED",
      latitude: monitoring.latitude,
      longitude: monitoring.longitude,
      waterBodyId: monitoring.waterBodyId,
      reportedById: reporter.id,
      satelliteScanId: scanId,
    },
  });
  return true;
}

async function createSatelliteAlerts(
  monitoring: {
    id: string;
    latitude: number;
    longitude: number;
    waterBody: { name: string };
  },
  scanId: string,
  data: {
    changePercent: number;
    riskLevel: RiskLevelValue;
    previousWaterAreaKm2: number;
    currentWaterAreaKm2: number;
    observationDate: Date;
    isSimulation: boolean;
    incidentId?: string;
    productId: string;
  }
): Promise<number> {
  if (data.riskLevel === "NORMAL") return 0;
  const recipients = await prisma.user.findMany({
    where: { role: { in: ["AUTHORITY", "ADMIN"] } },
    select: { id: true },
  });
  if (recipients.length === 0) return 0;

  const prefix = data.isSimulation ? "[TEST] " : "";
  const title = `${prefix}Water extent anomaly — ${monitoring.waterBody.name}`;
  const message =
    `Sentinel-2 detected a ${Math.abs(data.changePercent).toFixed(1)}% water decrease ` +
    `(${data.previousWaterAreaKm2.toFixed(2)} km² → ${data.currentWaterAreaKm2.toFixed(2)} km²). ` +
    `Risk: ${data.riskLevel}. Anomaly score: ${Math.abs(data.changePercent).toFixed(1)}. ` +
    `Product: ${data.productId}. Further investigation is required.` +
    (data.isSimulation ? " (Simulated test data.)" : "");

  const result = await prisma.alert.createMany({
    data: recipients.map((recipient) => ({
      type: "SATELLITE_ALERT" as const,
      title,
      message,
      userId: recipient.id,
      incidentId: data.incidentId ?? null,
      satelliteScanId: scanId,
      latitude: monitoring.latitude,
      longitude: monitoring.longitude,
    })),
    skipDuplicates: true,
  });

  if (result.count > 0) {
    await auditSatelliteAlertCreated(monitoring.id, result.count, {
      scanId,
      waterBody: monitoring.waterBody.name,
      riskLevel: data.riskLevel,
      changePercent: data.changePercent,
      observationDate: data.observationDate.toISOString(),
      isSimulation: data.isSimulation,
    });
  }
  return result.count;
}

export async function runSatelliteScan(
  monitoringId: string,
  requestedObservationDate?: Date
): Promise<ScanResult> {
  const monitoring = await prisma.satelliteMonitoring.findUnique({
    where: { id: monitoringId },
    include: { waterBody: true },
  });
  if (!monitoring) {
    throw new SatelliteScanError(
      "MONITORING_NOT_FOUND",
      "The monitoring configuration was not found.",
      404
    );
  }
  if (!isCopernicusConfigured()) {
    throw new SatelliteScanError(
      "COPERNICUS_NOT_CONFIGURED",
      "Copernicus credentials are not configured. Use Simulate for test data.",
      503
    );
  }

  try {
    const aoi = aoiFor(monitoring);
    const existingScans = await prisma.satelliteScan.findMany({
      where: { monitoringId, isSimulation: false, productId: { not: null } },
      select: { productId: true },
    });
    const lastObservation = await prisma.satelliteScan.findFirst({
      where: { monitoringId, isSimulation: false, status: "COMPLETED" },
      orderBy: { observationDate: "desc" },
      select: { observationDate: true },
    });
    const processedProducts = new Set(
      existingScans.flatMap((scan) => (scan.productId ? [scan.productId] : []))
    );
    const latest = await fetchLatestObservation(
      aoi,
      requestedObservationDate,
      processedProducts
    );

    if (!latest) {
      await prisma.satelliteMonitoring.update({
        where: { id: monitoringId },
        data: { lastCheckedAt: new Date() },
      });
      return {
        scanId: "",
        monitoringId,
        waterBodyName: monitoring.waterBody.name,
        observationDate: new Date(),
        previousObservationDate: null,
        waterAreaKm2: 0,
        previousWaterAreaKm2: null,
        changePercent: 0,
        riskLevel: "NORMAL",
        cloudCoverage: null,
        dataSource: "Copernicus (no newer suitable imagery)",
        isSimulation: false,
        alertCreated: false,
        lastObservationDate: lastObservation?.observationDate ?? null,
        status: "NO_DATA",
      };
    }

    const previousScan = await prisma.satelliteScan.findFirst({
      where: {
        monitoringId,
        isSimulation: false,
        status: "COMPLETED",
        observationDate: { lt: latest.observationDate },
      },
      orderBy: { observationDate: "desc" },
      select: {
        observationDate: true,
        waterAreaKm2: true,
      },
    });
    const previous =
      previousScan ??
      (await fetchPreviousObservation(aoi, latest.observationDate));
    const previousArea = previous?.waterAreaKm2 ?? null;
    const previousDate = previous?.observationDate ?? null;
    const changePercent =
      previousArea === null
        ? 0
        : calculateChangePercent(previousArea, latest.waterAreaKm2);
    const riskLevel = assessRiskLevel(changePercent, {
      watch: monitoring.thresholdWatch,
      high: monitoring.thresholdHigh,
      critical: monitoring.thresholdCritical,
    });
    const anomaly = riskLevel !== "NORMAL";

    const scan = await prisma.satelliteScan.create({
      data: {
        monitoringId,
        observationDate: latest.observationDate,
        previousObservationDate: previousDate,
        waterAreaKm2: latest.waterAreaKm2,
        previousWaterAreaKm2: previousArea,
        changePercent,
        riskLevel,
        cloudCoverage: latest.cloudCoverage,
        dataSource: latest.dataSource,
        isSimulation: false,
        alertCreated: false,
        status: "COMPLETED",
        productId: latest.productId,
        productTitle: latest.productTitle,
        acquisitionBbox: latest.bbox,
        waterPixels: latest.waterPixels,
        totalPixels: latest.totalPixels,
        pixelAreaKm2: latest.pixelAreaKm2,
        ndwiImageRef: null,
        rgbImageRef: null,
        anomaly,
      },
    });

    await prisma.satelliteScan.update({
      where: { id: scan.id },
      data: {
        rgbImageRef: `/api/monitoring/scans/${scan.id}/preview?kind=rgb`,
        ndwiImageRef: `/api/monitoring/scans/${scan.id}/preview?kind=ndwi`,
      },
    });

    let incidentCreated = false;
    let alertCount = 0;
    if (anomaly) {
      let incidentId: string | undefined;
      if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
        incidentCreated = await createSatelliteIncident(
          monitoring,
          scan.id,
          riskLevel,
          changePercent,
          previousArea ?? 0,
          latest.waterAreaKm2
        );
        if (incidentCreated) {
          const incident = await prisma.incident.findUnique({
            where: { satelliteScanId: scan.id },
            select: { id: true },
          });
          incidentId = incident?.id;
        }
      }
      alertCount = await createSatelliteAlerts(monitoring, scan.id, {
        changePercent,
        riskLevel,
        previousWaterAreaKm2: previousArea ?? 0,
        currentWaterAreaKm2: latest.waterAreaKm2,
        observationDate: latest.observationDate,
        isSimulation: false,
        incidentId,
        productId: latest.productId,
      });
    }
    await prisma.satelliteScan.update({
      where: { id: scan.id },
      data: { alertCreated: alertCount > 0 },
    });
    await prisma.satelliteMonitoring.update({
      where: { id: monitoringId },
      data: {
        lastCheckedAt: new Date(),
        latestObservationDate: latest.observationDate,
        latestWaterAreaKm2: latest.waterAreaKm2,
        latestChangePercent: previousArea === null ? null : changePercent,
        latestRiskLevel: riskLevel,
        previousObservationDate: previousDate,
        previousWaterAreaKm2: previousArea,
        status: "ACTIVE",
      },
    });
    await auditSatelliteScanCompleted(monitoringId, scan.id, {
      waterBody: monitoring.waterBody.name,
      changePercent: previousArea === null ? null : changePercent,
      riskLevel,
      dataSource: "Copernicus",
      alertCreated: alertCount > 0,
      incidentCreated,
    });

    return {
      scanId: scan.id,
      monitoringId,
      waterBodyName: monitoring.waterBody.name,
      observationDate: latest.observationDate,
      previousObservationDate: previousDate,
      waterAreaKm2: latest.waterAreaKm2,
      previousWaterAreaKm2: previousArea,
      changePercent,
      riskLevel,
      cloudCoverage: latest.cloudCoverage,
      dataSource: latest.dataSource,
      isSimulation: false,
      alertCreated: alertCount > 0,
      lastObservationDate: latest.observationDate,
      incidentCreated,
      status: "COMPLETED",
    };
  } catch (error) {
    const scanError = toScanError(error);
    await prisma.satelliteMonitoring.update({
      where: { id: monitoringId },
      data: { lastCheckedAt: new Date(), status: "ERROR" },
    });
    throw scanError;
  }
}

export async function runSimulatedScan(
  monitoringId: string,
  simulatedDecrease = -25
): Promise<ScanResult> {
  const monitoring = await prisma.satelliteMonitoring.findUnique({
    where: { id: monitoringId },
    include: { waterBody: true },
  });
  if (!monitoring) {
    throw new SatelliteScanError(
      "MONITORING_NOT_FOUND",
      "The monitoring configuration was not found.",
      404
    );
  }

  const previousArea = 85;
  const currentArea = previousArea * (1 + simulatedDecrease / 100);
  const riskLevel = assessRiskLevel(simulatedDecrease, {
    watch: monitoring.thresholdWatch,
    high: monitoring.thresholdHigh,
    critical: monitoring.thresholdCritical,
  });
  const observationDate = new Date();
  const previousDate = new Date(observationDate.getTime() - 10 * 86400_000);
  const scan = await prisma.satelliteScan.create({
    data: {
      monitoringId,
      observationDate,
      previousObservationDate: previousDate,
      waterAreaKm2: currentArea,
      previousWaterAreaKm2: previousArea,
      changePercent: simulatedDecrease,
      riskLevel,
      cloudCoverage: 5,
      dataSource: "SIMULATED (test data)",
      isSimulation: true,
      alertCreated: false,
      status: "COMPLETED",
      productId: `simulation:${observationDate.toISOString()}`,
      productTitle: "Simulated Sentinel-2 L2A",
      acquisitionBbox: aoiFor(monitoring),
      anomaly: riskLevel !== "NORMAL",
    },
  });

  let incidentCreated = false;
  let alertCount = 0;
  if (riskLevel !== "NORMAL") {
    let incidentId: string | undefined;
    if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
      incidentCreated = await createSatelliteIncident(
        monitoring,
        scan.id,
        riskLevel,
        simulatedDecrease,
        previousArea,
        currentArea
      );
      if (incidentCreated) {
        incidentId = (
          await prisma.incident.findUnique({
            where: { satelliteScanId: scan.id },
            select: { id: true },
          })
        )?.id;
      }
    }
    alertCount = await createSatelliteAlerts(monitoring, scan.id, {
      changePercent: simulatedDecrease,
      riskLevel,
      previousWaterAreaKm2: previousArea,
      currentWaterAreaKm2: currentArea,
      observationDate,
      isSimulation: true,
      incidentId,
      productId: scan.productId ?? "simulation",
    });
  }
  await prisma.satelliteScan.update({
    where: { id: scan.id },
    data: { alertCreated: alertCount > 0 },
  });
  await prisma.satelliteMonitoring.update({
    where: { id: monitoringId },
    data: {
      lastCheckedAt: new Date(),
      latestObservationDate: observationDate,
      latestWaterAreaKm2: currentArea,
      latestChangePercent: simulatedDecrease,
      latestRiskLevel: riskLevel,
      previousObservationDate: previousDate,
      previousWaterAreaKm2: previousArea,
      status: "ACTIVE",
    },
  });
  await auditSatelliteScanCompleted(monitoringId, scan.id, {
    waterBody: monitoring.waterBody.name,
    changePercent: simulatedDecrease,
    riskLevel,
    dataSource: "SIMULATED",
    isSimulation: true,
    alertCreated: alertCount > 0,
    incidentCreated,
  });

  return {
    scanId: scan.id,
    monitoringId,
    waterBodyName: monitoring.waterBody.name,
    observationDate,
    previousObservationDate: previousDate,
    waterAreaKm2: currentArea,
    previousWaterAreaKm2: previousArea,
    changePercent: simulatedDecrease,
    riskLevel,
    cloudCoverage: 5,
    dataSource: "SIMULATED (test data)",
    isSimulation: true,
    alertCreated: alertCount > 0,
    lastObservationDate: observationDate,
    incidentCreated,
    status: "COMPLETED",
  };
}

export async function runAllActiveScans(): Promise<ScanResult[]> {
  const monitors = await prisma.satelliteMonitoring.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  const results: ScanResult[] = [];
  for (const monitor of monitors) {
    results.push(await runSatelliteScan(monitor.id));
  }
  return results;
}
