-- Satellite monitoring and automatically detected incidents.
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'DETECTED';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'SATELLITE_ALERT';

CREATE TYPE "MonitoringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR');
CREATE TYPE "RiskLevel" AS ENUM ('NORMAL', 'WATCH', 'HIGH', 'CRITICAL');

ALTER TABLE "Incident"
  ADD COLUMN "satelliteScanId" TEXT;

ALTER TABLE "Alert"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "satelliteScanId" TEXT;

CREATE TABLE "SatelliteMonitoring" (
  "id" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "bboxNorth" DOUBLE PRECISION NOT NULL,
  "bboxSouth" DOUBLE PRECISION NOT NULL,
  "bboxEast" DOUBLE PRECISION NOT NULL,
  "bboxWest" DOUBLE PRECISION NOT NULL,
  "status" "MonitoringStatus" NOT NULL DEFAULT 'ACTIVE',
  "thresholdWatch" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "thresholdHigh" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "thresholdCritical" DOUBLE PRECISION NOT NULL DEFAULT 35,
  "lastCheckedAt" TIMESTAMP(3),
  "previousObservationDate" TIMESTAMP(3),
  "previousWaterAreaKm2" DOUBLE PRECISION,
  "latestObservationDate" TIMESTAMP(3),
  "latestWaterAreaKm2" DOUBLE PRECISION,
  "latestChangePercent" DOUBLE PRECISION,
  "latestRiskLevel" "RiskLevel",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "waterBodyId" TEXT NOT NULL,
  CONSTRAINT "SatelliteMonitoring_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SatelliteScan" (
  "id" TEXT NOT NULL,
  "observationDate" TIMESTAMP(3) NOT NULL,
  "previousObservationDate" TIMESTAMP(3),
  "waterAreaKm2" DOUBLE PRECISION NOT NULL,
  "previousWaterAreaKm2" DOUBLE PRECISION,
  "changePercent" DOUBLE PRECISION NOT NULL,
  "riskLevel" "RiskLevel" NOT NULL,
  "cloudCoverage" DOUBLE PRECISION,
  "dataSource" TEXT NOT NULL,
  "isSimulation" BOOLEAN NOT NULL DEFAULT false,
  "alertCreated" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "errorMessage" TEXT,
  "productId" TEXT,
  "productTitle" TEXT,
  "acquisitionBbox" JSONB,
  "waterPixels" INTEGER,
  "totalPixels" INTEGER,
  "pixelAreaKm2" DOUBLE PRECISION,
  "ndwiImageRef" TEXT,
  "rgbImageRef" TEXT,
  "anomaly" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "monitoringId" TEXT NOT NULL,
  CONSTRAINT "SatelliteScan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Incident_satelliteScanId_key" ON "Incident"("satelliteScanId");
CREATE INDEX "Alert_satelliteScanId_idx" ON "Alert"("satelliteScanId");
CREATE UNIQUE INDEX "Alert_userId_satelliteScanId_key" ON "Alert"("userId", "satelliteScanId");
CREATE UNIQUE INDEX "SatelliteMonitoring_waterBodyId_key" ON "SatelliteMonitoring"("waterBodyId");
CREATE INDEX "SatelliteMonitoring_status_idx" ON "SatelliteMonitoring"("status");
CREATE INDEX "SatelliteMonitoring_waterBodyId_idx" ON "SatelliteMonitoring"("waterBodyId");
CREATE UNIQUE INDEX "SatelliteScan_monitoringId_productId_key" ON "SatelliteScan"("monitoringId", "productId");
CREATE INDEX "SatelliteScan_monitoringId_createdAt_idx" ON "SatelliteScan"("monitoringId", "createdAt");
CREATE INDEX "SatelliteScan_riskLevel_idx" ON "SatelliteScan"("riskLevel");
CREATE INDEX "SatelliteScan_isSimulation_idx" ON "SatelliteScan"("isSimulation");

ALTER TABLE "Incident"
  ADD CONSTRAINT "Incident_satelliteScanId_fkey"
  FOREIGN KEY ("satelliteScanId") REFERENCES "SatelliteScan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Alert"
  ADD CONSTRAINT "Alert_satelliteScanId_fkey"
  FOREIGN KEY ("satelliteScanId") REFERENCES "SatelliteScan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SatelliteMonitoring"
  ADD CONSTRAINT "SatelliteMonitoring_waterBodyId_fkey"
  FOREIGN KEY ("waterBodyId") REFERENCES "WaterBody"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SatelliteScan"
  ADD CONSTRAINT "SatelliteScan_monitoringId_fkey"
  FOREIGN KEY ("monitoringId") REFERENCES "SatelliteMonitoring"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
