-- Complete satellite monitoring columns that may have been created by an
-- earlier schema push without the full migration.
ALTER TABLE "Incident"
  ADD COLUMN IF NOT EXISTS "satelliteScanId" TEXT;

ALTER TABLE "Alert"
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "satelliteScanId" TEXT;

ALTER TABLE "SatelliteScan"
  ADD COLUMN IF NOT EXISTS "productId" TEXT,
  ADD COLUMN IF NOT EXISTS "productTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "acquisitionBbox" JSONB,
  ADD COLUMN IF NOT EXISTS "waterPixels" INTEGER,
  ADD COLUMN IF NOT EXISTS "totalPixels" INTEGER,
  ADD COLUMN IF NOT EXISTS "pixelAreaKm2" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "ndwiImageRef" TEXT,
  ADD COLUMN IF NOT EXISTS "rgbImageRef" TEXT,
  ADD COLUMN IF NOT EXISTS "anomaly" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Incident_satelliteScanId_key"
  ON "Incident"("satelliteScanId");
CREATE INDEX IF NOT EXISTS "Alert_satelliteScanId_idx"
  ON "Alert"("satelliteScanId");
CREATE UNIQUE INDEX IF NOT EXISTS "Alert_userId_satelliteScanId_key"
  ON "Alert"("userId", "satelliteScanId");
CREATE UNIQUE INDEX IF NOT EXISTS "SatelliteScan_monitoringId_productId_key"
  ON "SatelliteScan"("monitoringId", "productId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Incident_satelliteScanId_fkey'
  ) THEN
    ALTER TABLE "Incident"
      ADD CONSTRAINT "Incident_satelliteScanId_fkey"
      FOREIGN KEY ("satelliteScanId") REFERENCES "SatelliteScan"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Alert_satelliteScanId_fkey'
  ) THEN
    ALTER TABLE "Alert"
      ADD CONSTRAINT "Alert_satelliteScanId_fkey"
      FOREIGN KEY ("satelliteScanId") REFERENCES "SatelliteScan"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
