ALTER TABLE "WaterBody"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "waterAreaKm2" DOUBLE PRECISION,
  ADD COLUMN "riskLevel" "RiskLevel",
  ADD COLUMN "geometry" JSONB;

UPDATE "WaterBody"
SET
  "latitude" = ("coordinates"->>'lat')::double precision,
  "longitude" = ("coordinates"->>'lng')::double precision
WHERE "coordinates"->>'lat' IS NOT NULL
  AND "coordinates"->>'lng' IS NOT NULL;

UPDATE "WaterBody"
SET
  "latitude" = 27.7139,
  "longitude" = 68.8369,
  "waterAreaKm2" = COALESCE("waterAreaKm2", 42.5),
  "riskLevel" = COALESCE("riskLevel", 'HIGH'::"RiskLevel"),
  "geometry" = '{"type":"LineString","coordinates":[[68.821,27.724],[68.833,27.718],[68.846,27.711],[68.861,27.704],[68.878,27.697],[68.894,27.691]]}'::jsonb
WHERE lower("name") LIKE '%nara canal%';

UPDATE "WaterBody"
SET
  "latitude" = 27.7032,
  "longitude" = 68.8570,
  "waterAreaKm2" = COALESCE("waterAreaKm2", 125.0),
  "riskLevel" = COALESCE("riskLevel", 'WATCH'::"RiskLevel")
WHERE lower("name") LIKE '%indus river%';
