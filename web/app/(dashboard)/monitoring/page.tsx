import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthorityOrAdmin } from "@/lib/rbac";
import { isCopernicusConfigured } from "@/lib/services/satellite";
import { getCurrentTimestamp } from "@/lib/format-date";
import { MonitoringDashboard } from "@/components/monitoring/monitoring-dashboard";

export default async function MonitoringPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const role = (session.user.role as string) ?? "CITIZEN";
  if (!isAuthorityOrAdmin({ role: role as "CITIZEN" | "INSPECTOR" | "NGO" | "AUTHORITY" | "ADMIN" })) {
    redirect("/dashboard");
  }

  const monitors = await prisma.satelliteMonitoring.findMany({
    include: {
      waterBody: { select: { id: true, name: true, type: true } },
      scans: {
        where: { isSimulation: false },
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const satelliteConfigured = isCopernicusConfigured();
  const renderedAt = getCurrentTimestamp();

  return (
    <MonitoringDashboard
      monitors={JSON.parse(JSON.stringify(monitors))}
      satelliteConfigured={satelliteConfigured}
      renderedAt={renderedAt}
    />
  );
}
