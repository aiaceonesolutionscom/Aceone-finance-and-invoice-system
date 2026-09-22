"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  searchable = false,
  placeholder = "Search...",
}: {
  basePath: string;
  paramName?: string;
  currentValue?: string;
  options: { value: string; label: string; subLabel?: string }[];
  extraParams?: Record<string, string | undefined>;
  className?: string;
  searchable?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const selectedValue = currentValue || options[0]?.value || "";
  const selectedOption = options.find((o) => o.value === selectedValue) ?? options[0];

  const handleSelect = (value: string | null) => {
    const next = !value || value === options[0]?.value ? undefined : value;
    router.push(buildHref(basePath, { ...extraParams, [paramName]: next }));
  };

  if (searchable) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("h-9 justify-between font-normal text-left", className ?? "w-48")}
            />
          }
        >
          <span className="truncate">{selectedOption?.label ?? options[0]?.label}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList className="max-h-60 overflow-y-auto">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.subLabel ?? ""}`}
                    onSelect={() => {
                      handleSelect(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4 shrink-0",
                        opt.value === selectedValue ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col truncate">
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel ? (
                        <span className="text-xs text-muted-foreground truncate">{opt.subLabel}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Select
      value={selectedValue}
      onValueChange={handleSelect}
    >
      <SelectTrigger className={className ?? "h-9 w-48"}>
        {/* Base UI's Select.Value shows the raw value, not the matching
            item's label, unless given an explicit formatter — without this,
            the closed trigger reads "ALL" instead of "All Customers". */}
        <SelectValue>{(value: string) => options.find((o) => o.value === value)?.label ?? value}</SelectValue>
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
