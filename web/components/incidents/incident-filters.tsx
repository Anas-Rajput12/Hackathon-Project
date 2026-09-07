"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { POLLUTION_TYPES, SEVERITY_CONFIG, STATUS_CONFIG } from "@/lib/constants";

type Props = {
  waterBodies: { id: string; name: string }[];
};

export function IncidentFilters({ waterBodies }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const severity = searchParams.get("severity") ?? "";
  const status = searchParams.get("status") ?? "";
  const pollutionType = searchParams.get("pollutionType") ?? "";
  const waterBodyId = searchParams.get("waterBodyId") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const hasFilters = q || severity || status || pollutionType || waterBodyId;

  const clearAll = () => {
    router.push(pathname);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
      <div className="lg:col-span-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search incidents..."
          defaultValue={q}
          onBlur={(e) => updateParam("q", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              updateParam("q", (e.target as HTMLInputElement).value);
            }
          }}
          className="pl-9"
        />
      </div>

      <Select
        value={severity}
        onChange={(e) => updateParam("severity", e.target.value)}
        className="lg:col-span-2"
      >
        <option value="">All severities</option>
        {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </Select>

      <Select
        value={status}
        onChange={(e) => updateParam("status", e.target.value)}
        className="lg:col-span-2"
      >
        <option value="">All statuses</option>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </Select>

      <Select
        value={pollutionType}
        onChange={(e) => updateParam("pollutionType", e.target.value)}
        className="lg:col-span-2"
      >
        <option value="">All types</option>
        {POLLUTION_TYPES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </Select>

      <Select
        value={waterBodyId}
        onChange={(e) => updateParam("waterBodyId", e.target.value)}
        className="lg:col-span-2"
      >
        <option value="">All water bodies</option>
        {waterBodies.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </Select>

      {hasFilters && (
        <div className="lg:col-span-12 flex items-center justify-end">
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-xs">
            <X className="h-3 w-3" /> Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
