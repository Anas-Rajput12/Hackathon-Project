import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { IncidentFilters } from "@/components/incidents/incident-filters";
import { IncidentCard, IncidentListSkeleton, type IncidentListItem } from "@/components/incidents/incident-card";
import { Pagination } from "@/components/incidents/pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { SEVERITIES, INCIDENT_STATUSES } from "@/lib/validations/incident";
import type { Role } from "@/types";
type SearchParams = {
  q?: string;
  severity?: string;
  status?: string;
  pollutionType?: string;
  waterBodyId?: string;
  page?: string;
  limit?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function IncidentsPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(sp.limit ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;

  const severity = sp.severity && SEVERITIES.includes(sp.severity as never) ? sp.severity : undefined;
  const status = sp.status && INCIDENT_STATUSES.includes(sp.status as never) ? sp.status : undefined;
  const pollutionType = sp.pollutionType || undefined;
  const waterBodyId = sp.waterBodyId || undefined;
  const q = sp.q || undefined;

  const role = ((session.user.role as string) || "CITIZEN") as Role;
  const userId = session.user.id;

  const roleFilter: Prisma.IncidentWhereInput =
    role === "AUTHORITY" || role === "ADMIN"
      ? {}
      : role === "INSPECTOR"
        ? {
            OR: [
              { reportedById: userId },
              { assignment: { inspectorId: userId } },
            ],
          }
        : { reportedById: userId };

  const filterWhere: Prisma.IncidentWhereInput = {
    ...(severity ? { severity: severity as Prisma.EnumSeverityFilter } : {}),
    ...(status ? { status: status as Prisma.EnumIncidentStatusFilter } : {}),
    ...(pollutionType ? { pollutionType } : {}),
    ...(waterBodyId ? { waterBodyId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const where: Prisma.IncidentWhereInput = { AND: [roleFilter, filterWhere] };

  const [incidents, total, waterBodies] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: { reportedAt: "desc" },
      skip,
      take: limit,
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        waterBody: { select: { id: true, name: true, type: true } },
        _count: { select: { evidence: true, alerts: true } },
      },
    }) as Promise<IncidentListItem[]>,
    prisma.incident.count({ where }),
    prisma.waterBody.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
          <p className="text-sm text-muted-foreground">
            View and manage water pollution reports. {total.toLocaleString()} total.
          </p>
        </div>
        <Button asChild>
          <Link href="/incidents/new">
            <Plus className="h-4 w-4 mr-2" /> Report Incident
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <Suspense fallback={null}>
            <IncidentFilters waterBodies={waterBodies} />
          </Suspense>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={<IncidentListSkeleton />}>
            {incidents.length === 0 ? (
              <EmptyState hasFilters={!!(q || severity || status || pollutionType || waterBodyId)} />
            ) : (
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))}
              </div>
            )}
          </Suspense>
          <Pagination page={page} totalPages={totalPages} total={total} limit={limit} />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="py-16 text-center">
      <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="text-base font-semibold">
        {hasFilters ? "No matching incidents" : "No incidents yet"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        {hasFilters
          ? "Try adjusting your filters or search query."
          : "Be the first to report a water pollution incident."}
      </p>
      {!hasFilters && (
        <Button asChild className="mt-4">
          <Link href="/incidents/new">
            <Plus className="h-4 w-4 mr-2" /> Report Incident
          </Link>
        </Button>
      )}
    </div>
  );
}
