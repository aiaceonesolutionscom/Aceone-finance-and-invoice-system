"use client";

import { useState } from "react";
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

export type CustomerOption = {
  id: number;
  customerName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export function CustomerCombobox({
  customers,
  value,
  onChange,
}: {
  customers: CustomerOption[];
  value: number | null;
  onChange: (customer: CustomerOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = customers.find((c) => c.id === value) ?? null;

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
        {selected
          ? `${selected.customerName}${selected.companyName ? ` — ${selected.companyName}` : ""}`
          : "Select customer..."}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search customers..." />
          <CommandList>
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`${customer.customerName} ${customer.companyName ?? ""}`}
                  onSelect={() => {
                    onChange(customer);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      customer.id === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <div>{customer.customerName}</div>
                    {customer.companyName ? (
                      <div className="text-xs text-muted-foreground">{customer.companyName}</div>
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
