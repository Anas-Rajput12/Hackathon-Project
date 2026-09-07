import { prisma } from "@/lib/db";
import type { AuthedUser } from "@/lib/rbac";
import { Prisma } from "@/generated/prisma/client";

type AuditAction =
  | "INCIDENT_CREATED"
  | "INCIDENT_UPDATED"
  | "INCIDENT_DELETED"
  | "STATUS_CHANGED"
  | "EVIDENCE_UPLOADED"
  | "EVIDENCE_REVIEWED"
  | "INSPECTOR_ASSIGNED"
  | "INSPECTOR_REASSIGNED"
  | "USER_ROLE_CHANGED"
  | "WATER_BODY_CREATED"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "SATELLITE_SCAN_COMPLETED"
  | "SATELLITE_ALERT_CREATED";

type CreateAuditLogInput = {
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  userId?: string;
};

export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      userId: input.userId ?? null,
    },
  });
}

export async function auditIncidentCreated(
  user: AuthedUser,
  incidentId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: "INCIDENT_CREATED",
    entityType: "Incident",
    entityId: incidentId,
    metadata,
    userId: user.id,
  });
}

export async function auditIncidentUpdated(
  user: AuthedUser,
  incidentId: string,
  changes: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: "INCIDENT_UPDATED",
    entityType: "Incident",
    entityId: incidentId,
    metadata: { changes },
    userId: user.id,
  });
}

export async function auditStatusChanged(
  user: AuthedUser,
  incidentId: string,
  from: string,
  to: string
): Promise<void> {
  await createAuditLog({
    action: "STATUS_CHANGED",
    entityType: "Incident",
    entityId: incidentId,
    metadata: { from, to },
    userId: user.id,
  });
}

export async function auditIncidentDeleted(
  user: AuthedUser,
  incidentId: string
): Promise<void> {
  await createAuditLog({
    action: "INCIDENT_DELETED",
    entityType: "Incident",
    entityId: incidentId,
    userId: user.id,
  });
}

export async function auditEvidenceUploaded(
  user: AuthedUser,
  evidenceId: string,
  incidentId: string
): Promise<void> {
  await createAuditLog({
    action: "EVIDENCE_UPLOADED",
    entityType: "Evidence",
    entityId: evidenceId,
    metadata: { incidentId },
    userId: user.id,
  });
}

export async function auditEvidenceReviewed(
  user: AuthedUser,
  evidenceId: string,
  incidentId: string,
  status: string,
  previousStatus: string
): Promise<void> {
  await createAuditLog({
    action: "EVIDENCE_REVIEWED",
    entityType: "Evidence",
    entityId: evidenceId,
    metadata: { incidentId, status, previousStatus },
    userId: user.id,
  });
}

export async function auditInspectorAssigned(
  user: AuthedUser,
  incidentId: string,
  inspectorId: string,
  previousInspectorId?: string | null
): Promise<void> {
  await createAuditLog({
    action: previousInspectorId ? "INSPECTOR_REASSIGNED" : "INSPECTOR_ASSIGNED",
    entityType: "Assignment",
    entityId: incidentId,
    metadata: { inspectorId, previousInspectorId },
    userId: user.id,
  });
}

export async function auditUserRoleChanged(
  adminUser: AuthedUser,
  targetUserId: string,
  from: string,
  to: string
): Promise<void> {
  await createAuditLog({
    action: "USER_ROLE_CHANGED",
    entityType: "User",
    entityId: targetUserId,
    metadata: { from, to, changedBy: adminUser.id },
    userId: adminUser.id,
  });
}

export async function auditWaterBodyCreated(
  user: AuthedUser,
  waterBodyId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: "WATER_BODY_CREATED",
    entityType: "WaterBody",
    entityId: waterBodyId,
    metadata,
    userId: user.id,
  });
}

export async function auditSatelliteScanCompleted(
  monitoringId: string,
  scanId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: "SATELLITE_SCAN_COMPLETED",
    entityType: "SatelliteScan",
    entityId: scanId,
    metadata: { ...metadata, monitoringId },
  });
}

export async function auditSatelliteAlertCreated(
  monitoringId: string,
  alertCount: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: "SATELLITE_ALERT_CREATED",
    entityType: "SatelliteMonitoring",
    entityId: monitoringId,
    metadata: { ...metadata, alertCount },
  });
}
