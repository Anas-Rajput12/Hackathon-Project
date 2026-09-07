"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";
import { MobileNavigation } from "@/components/layout/sidebar";
import type { Role } from "@/types";

type TopBarProps = { user: { id: string; name: string; email: string; role: Role; image: string | null }; unreadAlerts: number };

function getPageContext(pathname: string) {
  if (pathname.startsWith("/dashboard")) return ["Overview", "Water integrity workspace"];
  if (pathname.startsWith("/incidents/new")) return ["Report incident", "Document a new observation"];
  if (pathname.startsWith("/incidents/")) return ["Incident details", "Evidence and response history"];
  if (pathname.startsWith("/incidents")) return ["Incidents", "Reports and response progress"];
  if (pathname.startsWith("/map")) return ["Water map", "Geographic incident context"];
  if (pathname.startsWith("/evidence")) return ["Evidence", "Review submitted supporting material"];
  if (pathname.startsWith("/alerts")) return ["Alerts", "Priority response signals"];
  if (pathname.startsWith("/analytics")) return ["Analytics", "Water integrity trends"];
  if (pathname.startsWith("/authority")) return ["Authority center", "Operational coordination"];
  if (pathname.startsWith("/monitoring")) return ["Satellite monitoring", "Water body change detection"];
  if (pathname.startsWith("/admin/users")) return ["User management", "Access and roles"];
  if (pathname.startsWith("/admin/audit-logs")) return ["Audit log", "Accountability activity"];
  return ["AquaTrace", "Water integrity operations"];
}

export function TopBar({ user, unreadAlerts }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [title, subtitle] = getPageContext(pathname);
  const initials = user.name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";
  const handleSignOut = async () => { await authClient.signOut(); router.replace("/login"); router.refresh(); };

  return <header className="flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-background/85 px-4 backdrop-blur-xl sm:px-6"><div className="flex min-w-0 items-center gap-1 sm:gap-3"><MobileNavigation role={user.role} /><div className="min-w-0"><h1 className="truncate text-base font-semibold tracking-tight text-[#173b45] sm:text-lg">{title}</h1><p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p></div></div><div className="flex shrink-0 items-center gap-1.5 sm:gap-3"><Button variant="ghost" size="icon" className="relative rounded-xl" asChild><Link href="/alerts" aria-label="View alerts"><Bell className="h-[18px] w-[18px]" />{unreadAlerts > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">{unreadAlerts > 99 ? "99+" : unreadAlerts}</span>}</Link></Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 gap-2 rounded-xl px-1.5 sm:px-2"><Avatar className="h-8 w-8 border border-primary/10"><AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback></Avatar><span className="hidden max-w-[140px] truncate text-sm font-medium md:inline">{user.name}</span><ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5"><DropdownMenuLabel className="px-2.5 py-2.5"><div className="flex flex-col space-y-1"><p className="text-sm font-semibold">{user.name}</p><p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p><Badge variant="outline" className="mt-1 w-fit text-[10px]">{user.role}</Badge></div></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem className="rounded-lg" onClick={() => router.push("/dashboard")}><UserIcon className="h-4 w-4" /> Overview</DropdownMenuItem><DropdownMenuItem className="rounded-lg text-destructive focus:text-destructive" onClick={handleSignOut}><LogOut className="h-4 w-4" /> Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header>;
}
