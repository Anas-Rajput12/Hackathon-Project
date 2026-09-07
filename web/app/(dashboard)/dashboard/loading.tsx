import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="mx-auto max-w-[1500px] space-y-6"><Skeleton className="h-40 w-full rounded-2xl" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div><div className="grid gap-6 xl:grid-cols-[1.65fr_0.8fr]"><Skeleton className="h-[470px]" /><Skeleton className="h-[470px]" /></div></div>;
}
