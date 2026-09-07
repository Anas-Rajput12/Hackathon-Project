import { fromArrayBuffer } from "geotiff";

const COPERNICUS_TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const COPERNICUS_STAC_URL =
  "https://catalogue.dataspace.copernicus.eu/stac/search";
const COPERNICUS_PROCESS_URL =
  "https://sh.dataspace.copernicus.eu/api/v1/process";

export type Aoi = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type SatelliteObservation = {
  observationDate: Date;
  waterAreaKm2: number;
  cloudCoverage: number;
  productId: string;
  productTitle: string;
  dataSource: string;
  bbox: Aoi;
  waterPixels: number;
  totalPixels: number;
  pixelAreaKm2: number;
  ndwiImageRef: string;
  rgbImageRef: string;
};

export class SatelliteServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "SatelliteServiceError";
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function getCopernicusCredentials(): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = process.env.COPERNICUS_CLIENT_ID;
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function isCopernicusConfigured(): boolean {
  return getCopernicusCredentials() !== null;
}

function validateAoi(aoi: Aoi): void {
  if (
    ![aoi.north, aoi.south, aoi.east, aoi.west].every(Number.isFinite) ||
    aoi.north <= aoi.south ||
    aoi.east <= aoi.west ||
    aoi.north > 90 ||
    aoi.south < -90 ||
    aoi.east > 180 ||
    aoi.west < -180
  ) {
    throw new SatelliteServiceError(
      "INVALID_AOI",
      "The monitoring area boundary is invalid.",
      false
    );
  }
}

async function getAccessToken(): Promise<string> {
  const credentials = getCopernicusCredentials();
  if (!credentials) {
    throw new SatelliteServiceError(
      "COPERNICUS_NOT_CONFIGURED",
      "Copernicus credentials are not configured.",
      false
    );
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  let response: Response;
  try {
    response = await fetch(COPERNICUS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new SatelliteServiceError(
      "COPERNICUS_AUTH_UNAVAILABLE",
      "Copernicus authentication could not be reached.",
      true
    );
  }

  if (!response.ok) {
    throw new SatelliteServiceError(
      "COPERNICUS_AUTH_FAILED",
      `Copernicus authentication failed (${response.status}).`,
      response.status >= 500
    );
  }

  const data = (await response.json()) as {
    access_token?: unknown;
    expires_in?: unknown;
  };
  if (
    typeof data.access_token !== "string" ||
    !data.access_token ||
    typeof data.expires_in !== "number" ||
    !Number.isFinite(data.expires_in)
  ) {
    throw new SatelliteServiceError(
      "COPERNICUS_AUTH_RESPONSE_INVALID",
      "Copernicus returned an invalid authentication response.",
      true
    );
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

function aoiToBbox(aoi: Aoi): [number, number, number, number] {
  return [aoi.west, aoi.south, aoi.east, aoi.north];
}

function aoiToGeoJson(aoi: Aoi) {
  return {
    type: "Polygon" as const,
    coordinates: [
      [
        [aoi.west, aoi.south],
        [aoi.east, aoi.south],
        [aoi.east, aoi.north],
        [aoi.west, aoi.north],
        [aoi.west, aoi.south],
      ],
    ],
  };
}

type SentinelProduct = {
  id: string;
  date: Date;
  cloudCoverage: number;
  title: string;
};

export async function searchSentinel2Products(
  aoi: Aoi,
  fromDate: Date,
  toDate: Date,
  maxCloudCoverage = 25,
  excludedProductIds: ReadonlySet<string> = new Set()
): Promise<SentinelProduct[]> {
  validateAoi(aoi);
  const responseBody = {
    bbox: aoiToBbox(aoi),
    datetime: `${fromDate.toISOString()}/${toDate.toISOString()}`,
    collections: ["sentinel-2-l2a"],
    query: { "eo:cloud_cover": { lte: maxCloudCoverage } },
    sortby: [{ field: "datetime", direction: "desc" }],
    limit: 50,
  };

  let response: Response;
  try {
    response = await fetch(COPERNICUS_STAC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(responseBody),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new SatelliteServiceError(
      "STAC_UNAVAILABLE",
      "The Copernicus imagery catalogue could not be reached.",
      true
    );
  }
  if (!response.ok) {
    throw new SatelliteServiceError(
      "STAC_SEARCH_FAILED",
      `Copernicus imagery search failed (${response.status}).`,
      response.status >= 500
    );
  }

  const data = (await response.json()) as {
    features?: Array<{
      id?: unknown;
      properties?: {
        datetime?: unknown;
        "eo:cloud_cover"?: unknown;
        title?: unknown;
      };
    }>;
  };

  return (data.features ?? []).flatMap((feature) => {
    const id = feature.id;
    const datetime = feature.properties?.datetime;
    const date = typeof datetime === "string" ? new Date(datetime) : null;
    if (
      typeof id !== "string" ||
      !id ||
      excludedProductIds.has(id) ||
      !date ||
      Number.isNaN(date.getTime())
    ) {
      return [];
    }

    const cloudCoverage = feature.properties?.["eo:cloud_cover"];
    return [
      {
        id,
        date,
        cloudCoverage:
          typeof cloudCoverage === "number" && Number.isFinite(cloudCoverage)
            ? cloudCoverage
            : 0,
        title:
          typeof feature.properties?.title === "string"
            ? feature.properties.title
            : id,
      },
    ];
  });
}

const NDWI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B03", "B08", "dataMask"] }],
    output: { bands: 2, sampleType: "FLOAT32" }
  };
}
function evaluatePixel(sample) {
  const denominator = sample.B03 + sample.B08;
  const ndwi = denominator > 0 ? (sample.B03 - sample.B08) / denominator : -1;
  return [ndwi, sample.dataMask];
}`;

const RGB_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B03", "B02", "dataMask"] }],
    output: { bands: 4, sampleType: "UINT8" }
  };
}
function evaluatePixel(sample) {
  return [
    Math.min(255, Math.max(0, sample.B04 * 255 * 2.5)),
    Math.min(255, Math.max(0, sample.B03 * 255 * 2.5)),
    Math.min(255, Math.max(0, sample.B02 * 255 * 2.5)),
    sample.dataMask * 255
  ];
}`;

const NDWI_VISUALIZATION_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B03", "B08", "dataMask"] }],
    output: { bands: 4, sampleType: "UINT8" }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask <= 0) return [0, 0, 0, 0];
  const denominator = sample.B03 + sample.B08;
  const ndwi = denominator > 0 ? (sample.B03 - sample.B08) / denominator : -1;
  const water = Math.max(0, Math.min(1, (ndwi - 0.1) / 0.6));
  return [
    Math.round((1 - water) * 210 + water * 20),
    Math.round((1 - water) * 80 + water * 150),
    Math.round((1 - water) * 40 + water * 230),
    255
  ];
}`;

function productTimeRange(observationDate: Date): {
  from: string;
  to: string;
} {
  const from = new Date(observationDate.getTime() - 15 * 60_000);
  const to = new Date(observationDate.getTime() + 15 * 60_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

async function processImage(
  aoi: Aoi,
  observationDate: Date,
  token: string,
  evalscript: string,
  format: "image/tiff" | "image/png",
  output: { width: number; height: number },
  code: string
): Promise<ArrayBuffer> {
  const responseBody = {
    input: {
      bounds: { geometry: aoiToGeoJson(aoi) },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: productTimeRange(observationDate),
            mosaickingOrder: "mostRecent",
          },
        },
      ],
    },
    evalscript,
    output: {
      ...output,
      responses: [{ identifier: "default", format: { type: format } }],
    },
  };

  let response: Response;
  try {
    response = await fetch(COPERNICUS_PROCESS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(responseBody),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new SatelliteServiceError(
      `${code}_UNAVAILABLE`,
      "Copernicus image processing could not be reached.",
      true
    );
  }
  if (!response.ok) {
    throw new SatelliteServiceError(
      `${code}_FAILED`,
      `Copernicus image processing failed (${response.status}).`,
      response.status >= 500
    );
  }
  if (!response.headers.get("content-type")?.toLowerCase().includes(format)) {
    throw new SatelliteServiceError(
      `${code}_RESPONSE_INVALID`,
      "Copernicus returned an unexpected image format.",
      true
    );
  }
  const image = await response.arrayBuffer();
  if (image.byteLength === 0) {
    throw new SatelliteServiceError(
      `${code}_RESPONSE_EMPTY`,
      "Copernicus returned an empty image response.",
      true
    );
  }
  return image;
}

export function calculateAoiAreaKm2(aoi: Aoi): number {
  validateAoi(aoi);
  const radiusKm = 6371.0088;
  const north = (aoi.north * Math.PI) / 180;
  const south = (aoi.south * Math.PI) / 180;
  const longitude = ((aoi.east - aoi.west) * Math.PI) / 180;
  return radiusKm * radiusKm * longitude * (Math.sin(north) - Math.sin(south));
}

export function calculatePixelAreaKm2(aoi: Aoi, totalPixels: number): number {
  if (!Number.isFinite(totalPixels) || totalPixels <= 0) return 0;
  return calculateAoiAreaKm2(aoi) / totalPixels;
}

export async function estimateWaterAreaFromTiff(
  buffer: ArrayBuffer,
  aoi: Aoi
): Promise<{
  waterPixels: number;
  totalPixels: number;
  pixelAreaKm2: number;
  waterAreaKm2: number;
}> {
  let image: Awaited<
    ReturnType<Awaited<ReturnType<typeof fromArrayBuffer>>["getImage"]>
  >;
  try {
    const tiff = await fromArrayBuffer(buffer);
    image = await tiff.getImage();
  } catch {
    throw new SatelliteServiceError(
      "TIFF_DECODE_FAILED",
      "Copernicus returned an unreadable GeoTIFF image.",
      true
    );
  }

  let data: Awaited<ReturnType<typeof image.readRasters>>;
  try {
    data = await image.readRasters({ samples: [0, 1], interleave: false });
  } catch {
    throw new SatelliteServiceError(
      "TIFF_RASTERS_INVALID",
      "Copernicus image bands could not be read.",
      true
    );
  }

  if (!Array.isArray(data) || data.length !== 2) {
    throw new SatelliteServiceError(
      "TIFF_RASTERS_INVALID",
      "Copernicus image does not contain the required NDWI and validity bands.",
      true
    );
  }
  const [ndwiRaster, validMaskRaster] = data;
  if (
    !ndwiRaster ||
    !validMaskRaster ||
    ndwiRaster.length !== validMaskRaster.length
  ) {
    throw new SatelliteServiceError(
      "TIFF_RASTERS_INVALID",
      "Copernicus image bands have incompatible dimensions.",
      true
    );
  }

  let waterPixels = 0;
  let totalPixels = 0;
  for (let index = 0; index < ndwiRaster.length; index += 1) {
    const ndwi = ndwiRaster[index];
    const validMask = validMaskRaster[index];
    if (!Number.isFinite(ndwi) || !Number.isFinite(validMask) || validMask <= 0) {
      continue;
    }
    totalPixels += 1;
    if (ndwi > 0.1) waterPixels += 1;
  }
  if (totalPixels === 0) {
    throw new SatelliteServiceError(
      "NO_VALID_PIXELS",
      "The selected imagery has no valid pixels in this monitoring area.",
      false
    );
  }

  const pixelAreaKm2 = calculatePixelAreaKm2(aoi, totalPixels);
  return {
    waterPixels,
    totalPixels,
    pixelAreaKm2,
    waterAreaKm2: waterPixels * pixelAreaKm2,
  };
}

export async function fetchLatestObservation(
  aoi: Aoi,
  beforeDate?: Date,
  excludedProductIds: ReadonlySet<string> = new Set(),
  lookbackDays = 90
): Promise<SatelliteObservation | null> {
  validateAoi(aoi);
  const token = await getAccessToken();
  const toDate = beforeDate ?? new Date();
  const fromDate = new Date(toDate.getTime() - lookbackDays * 24 * 60 * 60_000);
  const products = await searchSentinel2Products(
    aoi,
    fromDate,
    toDate,
    25,
    excludedProductIds
  );
  if (products.length === 0) return null;

  for (const product of products) {
    try {
      const ndwiBuffer = await processImage(
        aoi,
        product.date,
        token,
        NDWI_EVALSCRIPT,
        "image/tiff",
        { width: 512, height: 512 },
        "PROCESS_NDWI"
      );
      const measurement = await estimateWaterAreaFromTiff(ndwiBuffer, aoi);
      await processImage(
        aoi,
        product.date,
        token,
        RGB_EVALSCRIPT,
        "image/png",
        { width: 2048, height: 1365 },
        "PROCESS_RGB"
      );

      const ref = encodeURIComponent(product.id);
      return {
        observationDate: product.date,
        waterAreaKm2: measurement.waterAreaKm2,
        cloudCoverage: product.cloudCoverage,
        productId: product.id,
        productTitle: product.title,
        dataSource: `Sentinel-2 L2A (${product.title})`,
        bbox: aoi,
        waterPixels: measurement.waterPixels,
        totalPixels: measurement.totalPixels,
        pixelAreaKm2: measurement.pixelAreaKm2,
        ndwiImageRef: `${COPERNICUS_PROCESS_URL}#ndwi:${ref}`,
        rgbImageRef: `${COPERNICUS_PROCESS_URL}#rgb:${ref}`,
      };
    } catch (error) {
      if (error instanceof SatelliteServiceError && error.code === "NO_VALID_PIXELS") {
        continue;
      }
      throw error;
    }
  }
  return null;
}

export async function fetchPreviousObservation(
  aoi: Aoi,
  beforeDate: Date,
  excludedProductIds: ReadonlySet<string> = new Set()
): Promise<SatelliteObservation | null> {
  const toDate = new Date(beforeDate.getTime() - 1);
  const fromDate = new Date(toDate.getTime() - 120 * 24 * 60 * 60_000);
  return fetchLatestObservation(aoi, toDate, excludedProductIds, 120).then((result) => {
    if (!result || result.observationDate < fromDate) return null;
    return result;
  });
}

export async function fetchObservationPreview(
  aoi: Aoi,
  observationDate: Date,
  kind: "rgb" | "ndwi" = "rgb"
): Promise<ArrayBuffer> {
  validateAoi(aoi);
  const token = await getAccessToken();
  return processImage(
    aoi,
    observationDate,
    token,
    kind === "ndwi" ? NDWI_VISUALIZATION_EVALSCRIPT : RGB_EVALSCRIPT,
    "image/png",
    { width: 2048, height: 1365 },
    kind === "ndwi" ? "PREVIEW_NDWI" : "PREVIEW_RGB"
  );
}

export function calculateChangePercent(
  previousArea: number,
  currentArea: number
): number {
  if (
    !Number.isFinite(previousArea) ||
    !Number.isFinite(currentArea) ||
    previousArea <= 0
  ) {
    return 0;
  }
  return ((currentArea - previousArea) / previousArea) * 100;
}

export type RiskLevelValue = "NORMAL" | "WATCH" | "HIGH" | "CRITICAL";

export function assessRiskLevel(
  changePercent: number,
  thresholds: { watch: number; high: number; critical: number }
): RiskLevelValue {
  if (!Number.isFinite(changePercent) || changePercent >= 0) return "NORMAL";
  const decrease = Math.abs(changePercent);
  if (decrease >= thresholds.critical) return "CRITICAL";
  if (decrease >= thresholds.high) return "HIGH";
  if (decrease >= thresholds.watch) return "WATCH";
  return "NORMAL";
}
