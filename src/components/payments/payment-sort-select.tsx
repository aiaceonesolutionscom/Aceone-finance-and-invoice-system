"use client";

import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PAYMENT_SORT_OPTIONS = [
  { value: "latest", label: "Latest Payment (Newest First)" },
  { value: "oldest", label: "Oldest Payment (Oldest First)" },
  { value: "amount_desc", label: "Highest Amount (High to Low)" },
  { value: "amount_asc", label: "Lowest Amount (Low to High)" },
  { value: "customer_asc", label: "Customer Name (A to Z)" },
] as const;

function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function PaymentSortSelect({
  basePath = "/payments",
  currentSort = "latest",
  extraParams = {},
}: {
  basePath?: string;
  currentSort?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const activeSort = currentSort || "latest";

  return (
    <div className="flex flex-col">
      <label className="mb-1 block text-xs text-muted-foreground">Sort By</label>
      <Select
        value={activeSort}
        onValueChange={(value) => {
          const sort = !value || value === "latest" ? undefined : value;
          const { page: _removed, ...restParams } = extraParams;
          router.push(buildHref(basePath, { ...restParams, sort }), { scroll: false });
        }}
      >
        <SelectTrigger className="h-8 w-[240px] text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <ArrowUpDown className="size-3.5 text-muted-foreground shrink-0" />
            <SelectValue>
              {(value: string) =>
                PAYMENT_SORT_OPTIONS.find((p) => p.value === value)?.label ?? value
              }
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
