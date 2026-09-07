import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireAuth, canViewAuditLogs } from "@/lib/api/auth";
import { AuditLogsTable } from "@/components/admin/audit-logs-table";

export default async function AuditLogsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const user = await requireAuth();
  if (!canViewAuditLogs(user)) {
    redirect("/dashboard");
  }

  return <AuditLogsTable />;
}
