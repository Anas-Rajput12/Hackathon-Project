import { z } from "zod";

export const POLLUTION_TYPES = [
  "Chemical",
  "Sewage",
  "Plastic",
  "Oil",
  "Industrial Waste",
  "Agricultural Runoff",
  "Unknown",
  "Other",
] as const;

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const INCIDENT_STATUSES = [
  "DETECTED",
  "OPEN",
  "UNDER_REVIEW",
  "VERIFIED",
  "RESOLVED",
  "CLOSED",
] as const;

const latitudeSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number(v) : v))
  .refine((n) => !Number.isNaN(n), { message: "Latitude is required" })
  .pipe(z.number().min(-90).max(90));

const longitudeSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number(v) : v))
  .refine((n) => !Number.isNaN(n), { message: "Longitude is required" })
  .pipe(z.number().min(-180).max(180));

const optionalDateSchema = z
  .union([z.date(), z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  });

export const createIncidentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().min(10, "Please provide more detail").max(5000),
  pollutionType: z.enum(POLLUTION_TYPES, { message: "Select a pollution type" }),
  severity: z.enum(SEVERITIES, { message: "Select a severity" }),
  waterBodyId: z.string().cuid().nullable().optional(),
  location: z.string().min(2).max(200),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  observedAt: optionalDateSchema,
  notes: z.string().max(2000).optional(),
});

export const updateIncidentSchema = z
  .object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).max(5000).optional(),
    pollutionType: z.enum(POLLUTION_TYPES).optional(),
    severity: z.enum(SEVERITIES).optional(),
    status: z.enum(INCIDENT_STATUSES).optional(),
    waterBodyId: z.string().cuid().nullable().optional(),
    location: z.string().min(2).max(200).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    notes: z.string().max(2000).optional(),
    resolvedAt: optionalDateSchema.nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });

export const createEvidenceSchema = z.object({
  incidentId: z.string().cuid(),
  description: z.string().max(500).optional(),
});

export const updateEvidenceSchema = z.object({
  description: z.string().max(500).optional(),
  status: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
  verificationConfidence: z.number().min(0).max(1).nullable().optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
