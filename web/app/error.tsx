"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-primary">Something went wrong</p>
      <h1 className="text-3xl font-bold tracking-tight">We couldn&apos;t load this page.</h1>
      <p className="text-muted-foreground">Please try again. If the problem continues, return to the dashboard and try later.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
