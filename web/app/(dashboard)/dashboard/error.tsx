"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-24 text-center"><h2 className="text-lg font-semibold text-[#173b45]">Dashboard data is unavailable</h2><p className="mt-2 text-sm text-muted-foreground">The command center could not load its current operating picture.</p><button type="button" onClick={reset} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</button></div>;
}
