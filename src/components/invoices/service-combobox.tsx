"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ServiceOption = { id: number; name: string };

export function ServiceCombobox({
  services,
  serviceId,
  customName,
  onSelectExisting,
  onSelectCustom,
}: {
  services: ServiceOption[];
  serviceId: number | null;
  customName: string | null;
  onSelectExisting: (service: ServiceOption) => void;
  onSelectCustom: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLabel = useMemo(() => {
    if (serviceId) return services.find((s) => s.id === serviceId)?.name ?? "";
    if (customName) return customName;
    return "";
  }, [serviceId, customName, services]);

  const exactMatch = services.some(
    (s) => s.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          />
        }
      >
        {selectedLabel || "Select or type a service..."}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type a new service..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandGroup>
              {services
                .filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()))
                .map((service) => (
                  <CommandItem
                    key={service.id}
                    value={service.name}
                    onSelect={() => {
                      onSelectExisting(service);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        service.id === serviceId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {service.name}
                  </CommandItem>
                ))}
              {search.trim() && !exactMatch ? (
                <CommandItem
                  value={`__create__${search}`}
                  onSelect={() => {
                    onSelectCustom(search.trim());
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Create &ldquo;{search.trim()}&rdquo;
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
