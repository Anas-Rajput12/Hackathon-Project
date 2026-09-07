UPDATE "SatelliteMonitoring" AS monitoring
SET
  "latitude" = 27.7032,
  "longitude" = 68.8570,
  "bboxNorth" = 27.9,
  "bboxSouth" = 27.5,
  "bboxEast" = 69.1,
  "bboxWest" = 68.6
FROM "WaterBody" AS water_body
WHERE monitoring."waterBodyId" = water_body."id"
  AND lower(water_body."name") LIKE '%indus river%';

UPDATE "SatelliteMonitoring" AS monitoring
SET
  "latitude" = 27.7139,
  "longitude" = 68.8369,
  "bboxNorth" = 27.85,
  "bboxSouth" = 27.55,
  "bboxEast" = 69.05,
  "bboxWest" = 68.65
FROM "WaterBody" AS water_body
WHERE monitoring."waterBodyId" = water_body."id"
  AND lower(water_body."name") LIKE '%nara canal%';
