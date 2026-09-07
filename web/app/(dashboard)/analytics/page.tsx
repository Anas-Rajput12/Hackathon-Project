import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireAuth, canViewAnalytics } from "@/lib/api/auth";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const user = await requireAuth();
  if (!canViewAnalytics(user)) {
    redirect("/dashboard");
  }

  return <AnalyticsDashboard />;
}
