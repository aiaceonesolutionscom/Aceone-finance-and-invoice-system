"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { DatePresetSelect } from "@/components/layout/date-preset-select";

function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function DateRangeFilter({
  basePath,
  dateFrom,
  dateTo,
  preset,
  extraParams = {},
}: {
  basePath: string;
  dateFrom?: string;
  dateTo?: string;
  preset?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();

  function navigate(next: { from?: string; to?: string }) {
    // A manual date pick overrides any active quick-range preset, so preset
    // is deliberately left out of the resulting URL.
    router.push(
      buildHref(basePath, {
        ...extraParams,
        from: next.from ?? dateFrom,
        to: next.to ?? dateTo,
      }),
      { scroll: false }
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-4">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Quick Range</label>
        <DatePresetSelect basePath={basePath} currentPreset={preset} extraParams={extraParams} />
      </div>
      <div className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">From</label>
          <Input
            type="date"
            defaultValue={dateFrom}
            className="h-8 w-36"
            onChange={(e) => navigate({ from: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To</label>
          <Input
            type="date"
            defaultValue={dateTo}
            className="h-8 w-36"
            onChange={(e) => navigate({ to: e.target.value })}
          />
        </div>
        <span className="pb-1.5 text-xs text-muted-foreground italic">Applies automatically</span>
      </div>
    </div>
  );
}
