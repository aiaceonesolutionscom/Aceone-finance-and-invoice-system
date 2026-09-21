"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function SearchBox({
  action,
  defaultValue,
  placeholder,
  extraHiddenParams,
}: {
  action: string;
  defaultValue?: string;
  placeholder: string;
  extraHiddenParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Keep the input in sync when the URL's ?q= changes from elsewhere
    // (e.g. browser back/forward) rather than from this component's own typing.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing controlled input to an external prop, not a derived computation
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.replace(buildHref(action, { ...extraHiddenParams, q: next || undefined }), { scroll: false });
    }, 300);
  }

  return (
    <div className="relative mb-4 max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}
