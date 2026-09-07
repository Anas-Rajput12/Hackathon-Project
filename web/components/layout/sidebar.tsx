"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, BarChart3, Bell, ChevronLeft, ClipboardList, Droplets, FileImage, LayoutDashboard, LogOut, Map, Menu, Satellite, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

type NavItem = { name: string; href: string; icon: React.ElementType; roles?: Role[] };

function getNavigation(role: Role): NavItem[] {
  const items: NavItem[] = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Incidents", href: "/incidents", icon: AlertTriangle },
    { name: "Water map", href: "/map", icon: Map },
    { name: "Evidence", href: "/evidence", icon: FileImage, roles: ["INSPECTOR", "AUTHORITY", "ADMIN"] },
    { name: "Alerts", href: "/alerts", icon: Bell },
    { name: "Analytics", href: "/analytics", icon: BarChart3, roles: ["NGO", "AUTHORITY", "ADMIN"] },
    { name: "Authority center", href: "/authority", icon: ShieldCheck, roles: ["AUTHORITY", "ADMIN"] },
    { name: "Satellite monitoring", href: "/monitoring", icon: Satellite, roles: ["AUTHORITY", "ADMIN"] },
  ];

  if (role === "ADMIN") {
    items.push({ name: "Users", href: "/admin/users", icon: Users, roles: ["ADMIN"] }, { name: "Audit log", href: "/admin/audit-logs", icon: ClipboardList, roles: ["ADMIN"] });
  }

  return items.filter((item) => !item.roles || item.roles.includes(role));
}

function SignOutButton({ compact = false, onComplete }: { compact?: boolean; onComplete?: () => void }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      onComplete?.();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return <button type="button" onClick={handleSignOut} disabled={isSigningOut} aria-label="Sign out" title="Sign out" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"><LogOut className="h-5 w-5 shrink-0" />{!compact && <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>}</button>;
}

function NavigationLinks({ role, collapsed = false, close }: { role: Role; collapsed?: boolean; close?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Primary navigation" className="space-y-1 p-3">{getNavigation(role).map((item) => {
    const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return <Link key={item.name} href={item.href} onClick={close} aria-current={active ? "page" : undefined} title={collapsed ? item.name : undefined} aria-label={collapsed ? item.name : undefined} className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all", collapsed && "justify-center px-0", active ? "bg-teal-300 text-[#083039] shadow-sm shadow-black/10" : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white")}><Icon className="h-[18px] w-[18px] shrink-0" />{!collapsed && <><span>{item.name}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#083039]" />}</>}</Link>;
  })}</nav>;
}

export function Sidebar({ role }: { role: Role }) {
  const [collapsed, setCollapsed] = useState(false);
  return <aside className={cn("hidden h-screen shrink-0 flex-col border-r border-white/10 bg-sidebar-background shadow-2xl shadow-slate-950/15 transition-[width] duration-200 lg:flex", collapsed ? "w-[76px]" : "w-[272px]")}>
    <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-4"><Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 overflow-hidden" title="AquaTrace dashboard"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-300 text-[#083039]"><Droplets className="h-5 w-5" /></span>{!collapsed && <span className="truncate text-lg font-semibold tracking-tight text-white">AquaTrace</span>}</Link><button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} title={collapsed ? "Expand navigation" : "Collapse navigation"} className="rounded-lg p-1.5 text-sidebar-foreground/60 transition hover:bg-white/10 hover:text-white"><ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} /></button></div>
    <div className="flex-1 overflow-y-auto">{!collapsed && <div className="px-6 pb-1 pt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">Workspace</div>}<NavigationLinks role={role} collapsed={collapsed} /></div>
    <div className="border-t border-white/10 p-3"><SignOutButton compact={collapsed} /></div>
  </aside>;
}

export function MobileNavigation({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></Button></DialogTrigger><DialogContent className="left-0 top-0 h-dvh w-[19rem] max-w-[88vw] translate-x-0 translate-y-0 rounded-none border-0 bg-sidebar-background p-0 text-white sm:rounded-none"><DialogTitle className="sr-only">Navigation</DialogTitle><DialogDescription className="sr-only">Open a dashboard section or sign out.</DialogDescription><div className="flex h-full flex-col"><div className="flex h-[72px] items-center border-b border-white/10 px-5"><Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-300 text-[#083039]"><Droplets className="h-5 w-5" /></span><span className="text-lg font-semibold tracking-tight">AquaTrace</span></Link></div><div className="px-6 pb-1 pt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">Workspace</div><div className="flex-1 overflow-y-auto"><NavigationLinks role={role} close={() => setOpen(false)} /></div><div className="border-t border-white/10 p-3"><SignOutButton onComplete={() => setOpen(false)} /></div></div></DialogContent></Dialog>;
}
