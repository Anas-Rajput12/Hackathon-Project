import { prisma } from "@/lib/db";
import type { Incident, Severity, AlertType } from "@/generated/prisma/client";

export async function createIncidentAlerts(
  incident: Incident & { reportedBy?: { name: string } }
): Promise<void> {
  const recipients = await prisma.user.findMany({
    where: { role: { in: ["AUTHORITY", "ADMIN"] } },
    select: { id: true },
  });

  if (recipients.length === 0) return;

  const severityLabel: Record<Severity, string> = {
    LOW: "Low-severity",
    MEDIUM: "Medium-severity",
    HIGH: "High-severity",
    CRITICAL: "Critical",
  };

  const alertType: AlertType =
    incident.severity === "CRITICAL" || incident.severity === "HIGH"
      ? "CRITICAL_POLLUTION"
      : "NEW_INCIDENT";

  const title =
    incident.severity === "CRITICAL"
      ? `Critical incident: ${incident.title}`
      : `New incident: ${incident.title}`;

  const message = `${severityLabel[incident.severity]} pollution reported. "${incident.description.slice(0, 120)}${incident.description.length > 120 ? "..." : ""}"`;

  await prisma.alert.createMany({
    data: recipients.map((r) => ({
      type: alertType,
      title,
      message,
      incidentId: incident.id,
      userId: r.id,
    })),
  });
}

export async function createStatusChangeAlert(
  incident: Incident,
  newStatus: string
): Promise<void> {
  if (!["VERIFIED", "RESOLVED", "CLOSED"].includes(newStatus)) return;

  const assignment = await prisma.assignment.findUnique({
    where: { incidentId: incident.id },
    select: { inspectorId: true },
  });

  const recipientIds = new Set<string>([
    incident.reportedById,
    ...(assignment?.inspectorId ? [assignment.inspectorId] : []),
  ]);

  const recipients = await prisma.user.findMany({
    where: {
      OR: [
        { id: { in: Array.from(recipientIds) } },
        { role: { in: ["AUTHORITY", "ADMIN"] } },
      ],
    },
    select: { id: true },
  });

  const type: AlertType = newStatus === "VERIFIED" ? "VERIFICATION" : "RESOLUTION";
  const title =
    newStatus === "VERIFIED"
      ? `Incident verified: ${incident.title}`
      : `Incident ${newStatus.toLowerCase()}: ${incident.title}`;
  const message = `Incident status updated to ${newStatus.replace("_", " ")}.`;

  await prisma.alert.createMany({
    data: recipients.map((r) => ({
      type,
      title,
      message,
      incidentId: incident.id,
      userId: r.id,
    })),
  });
}

type CreateAlertInput = {
  userId: string;
  type: AlertType;
  title: string;
  message: string;
  incidentId?: string | null;
};

export async function createAlertForUser(input: CreateAlertInput): Promise<void> {
  await prisma.alert.create({
    data: {
      type: input.type,
      title: input.title,
      message: input.message,
      userId: input.userId,
      incidentId: input.incidentId ?? null,
    },
  });
}
