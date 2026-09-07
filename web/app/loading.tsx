export default function Loading() {
  return (
    <main aria-live="polite" aria-label="Loading content" className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        {["one", "two", "three"].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border bg-muted/40" />
    </main>
  );
}
