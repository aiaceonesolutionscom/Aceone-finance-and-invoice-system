"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const presets = [
  { value: "all", label: "All Time" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
];

function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function DatePresetSelect({
  basePath,
  currentPreset,
  extraParams = {},
}: {
  basePath: string;
  currentPreset?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();

  return (
    <Select
      value={currentPreset ?? "all"}
      onValueChange={(value) => {
        const preset = !value || value === "all" ? undefined : value;
        router.push(buildHref(basePath, { ...extraParams, preset }));
      }}
    >
      <SelectTrigger className="h-9 w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {presets.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
