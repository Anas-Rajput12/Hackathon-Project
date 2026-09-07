import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const unreadAlerts = await prisma.alert.count({ where: { userId: session.user.id, isRead: false } });
  const user = { id: session.user.id, name: session.user.name, email: session.user.email, role: ((session.user.role as string) || "CITIZEN") as "CITIZEN" | "INSPECTOR" | "NGO" | "AUTHORITY" | "ADMIN", image: session.user.image ?? null };

  return <div className="flex h-screen overflow-hidden bg-[#f5fafb]"><Sidebar role={user.role} /><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><TopBar user={user} unreadAlerts={unreadAlerts} /><main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{children}</main></div></div>;
}
