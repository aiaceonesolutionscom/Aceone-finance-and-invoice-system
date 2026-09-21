"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function StatusFilterSelect({
  basePath,
  paramName = "status",
  currentValue,
  options,
  extraParams = {},
  className,
}: {
  basePath: string;
  paramName?: string;
  currentValue?: string;
  options: { value: string; label: string }[];
  extraParams?: Record<string, string | undefined>;
  className?: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={currentValue || options[0].value}
      onValueChange={(value) => {
        const next = !value || value === options[0].value ? undefined : value;
        router.push(buildHref(basePath, { ...extraParams, [paramName]: next }));
      }}
    >
      <SelectTrigger className={className ?? "h-9 w-48"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
