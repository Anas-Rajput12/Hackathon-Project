import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import type { Role, IncidentStatus } from "@/types";

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  image: string | null;
};

export const ALL_ROLES: Role[] = ["CITIZEN", "INSPECTOR", "NGO", "AUTHORITY", "ADMIN"];
export const STAFF_ROLES: Role[] = ["INSPECTOR", "AUTHORITY", "ADMIN"];
export const MANAGEMENT_ROLES: Role[] = ["AUTHORITY", "ADMIN"];

export async function requireAuth(): Promise<AuthedUser> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new ApiError(401, "Unauthorized", "You must be signed in.");
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (session.user.role as Role) ?? "CITIZEN",
    image: session.user.image ?? null,
  };
}

export async function optionalAuth(): Promise<AuthedUser | null> {
  try {
    return await requireAuth();
  } catch {
    return null;
  }
}

export function requireRole(user: AuthedUser, roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "Forbidden", "You do not have permission to perform this action.");
  }
}

export function requireAnyRole(user: AuthedUser, roles: Role[]): void {
  requireRole(user, roles);
}

export function isAdmin(user: Pick<AuthedUser, "role">): boolean {
  return user.role === "ADMIN";
}

export function isAuthorityOrAdmin(user: Pick<AuthedUser, "role">): boolean {
  return user.role === "AUTHORITY" || user.role === "ADMIN";
}

export function isStaff(user: Pick<AuthedUser, "role">): boolean {
  return STAFF_ROLES.includes(user.role);
}

type IncidentLike = {
  id: string;
  reportedById: string;
  status?: string;
  assignment?: { inspectorId: string } | null;
};

export function canViewIncident(user: AuthedUser, incident: IncidentLike): boolean {
  if (isStaff(user)) return true;
  if (incident.reportedById === user.id) return true;
  return false;
}

export function canEditIncident(user: AuthedUser, incident: IncidentLike): boolean {
  if (isAuthorityOrAdmin(user)) return true;
  if (user.role === "INSPECTOR" && incident.assignment?.inspectorId === user.id) return true;
  if (incident.reportedById === user.id) return true;
  return false;
}

export function canDeleteIncident(user: AuthedUser, incident: IncidentLike): boolean {
  if (isAuthorityOrAdmin(user)) return true;
  if (incident.reportedById === user.id) return true;
  return false;
}

export function canReviewEvidence(user: Pick<AuthedUser, "role">): boolean {
  return isStaff(user);
}

export function canAssignInspector(user: Pick<AuthedUser, "role">): boolean {
  return isAuthorityOrAdmin(user);
}

export function canChangeUserRole(user: Pick<AuthedUser, "role">): boolean {
  return isAdmin(user);
}

export function canViewAnalytics(user: Pick<AuthedUser, "role">): boolean {
  return user.role === "NGO" || user.role === "AUTHORITY" || user.role === "ADMIN";
}

export function canManageUsers(user: Pick<AuthedUser, "role">): boolean {
  return isAdmin(user);
}

export function canViewAuditLogs(user: Pick<AuthedUser, "role">): boolean {
  return isAdmin(user);
}

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  DETECTED: ["UNDER_REVIEW", "OPEN"],
  OPEN: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["OPEN", "VERIFIED"],
  VERIFIED: ["UNDER_REVIEW", "RESOLVED"],
  RESOLVED: ["VERIFIED", "CLOSED"],
  CLOSED: ["RESOLVED"],
};

export function validateStatusTransition(
  current: IncidentStatus,
  next: IncidentStatus,
  isAdminOverride = false
): boolean {
  if (current === next) return true;
  if (isAdminOverride) return true;
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

export function allowedNextStatuses(current: IncidentStatus, isAdmin = false): IncidentStatus[] {
  if (isAdmin) return ["DETECTED", "OPEN", "UNDER_REVIEW", "VERIFIED", "RESOLVED", "CLOSED"];
  return VALID_TRANSITIONS[current] ?? [];
}

export async function assertCanViewIncident(user: AuthedUser, incidentId: string): Promise<void> {
  if (isStaff(user)) return;
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    select: { reportedById: true },
  });
  if (!incident || incident.reportedById !== user.id) {
    throw new ApiError(403, "Forbidden", "You do not have access to this incident.");
  }
}

export function getRoleDashboardTitle(role: Role): string {
  switch (role) {
    case "CITIZEN":
      return "My Reports";
    case "INSPECTOR":
      return "Assigned Investigations";
    case "NGO":
      return "Environmental Overview";
    case "AUTHORITY":
      return "Water Integrity Command Center";
    case "ADMIN":
      return "System Administration";
    default:
      return "Dashboard";
  }
}

export function getRoleDashboardSubtitle(role: Role): string {
  switch (role) {
    case "CITIZEN":
      return "Track your pollution reports and alerts.";
    case "INSPECTOR":
      return "Manage your assigned investigations and evidence reviews.";
    case "NGO":
      return "Monitor environmental incidents and analytics.";
    case "AUTHORITY":
      return "Command-center view of critical water integrity incidents.";
    case "ADMIN":
      return "System-wide administration and audit controls.";
    default:
      return "Welcome back.";
  }
}
