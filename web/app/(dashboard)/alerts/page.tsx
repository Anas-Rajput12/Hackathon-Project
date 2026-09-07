import { AlertsClient } from "@/components/alerts/alerts-client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const PAGE_SIZE = 20;

type AlertsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const { page: pageParam } = await searchParams;
  const requestedPage = Number.parseInt(pageParam ?? "1", 10);
  const total = await prisma.alert.count({ where: { userId: session.user.id } });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages);

  const alerts = await prisma.alert.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <AlertsClient
      alerts={alerts.map((alert) => ({
        id: alert.id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        isRead: alert.isRead,
        createdAt: alert.createdAt.toISOString(),
        incidentId: alert.incidentId,
      }))}
      pagination={{ page, total, totalPages, limit: PAGE_SIZE }}
    />
  );
}
