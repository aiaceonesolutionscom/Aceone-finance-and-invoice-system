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

export type CategoryOption = { id: number; name: string };

export function CategoryCombobox({
  categories,
  categoryId,
  customCategory,
  onSelectExisting,
  onSelectCustom,
}: {
  categories: CategoryOption[];
  categoryId: number | null;
  customCategory: string | null;
  onSelectExisting: (category: CategoryOption) => void;
  onSelectCustom: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLabel = useMemo(() => {
    if (categoryId) return categories.find((c) => c.id === categoryId)?.name ?? "";
    if (customCategory) return customCategory;
    return "";
  }, [categoryId, customCategory, categories]);

  const exactMatch = categories.some(
    (c) => c.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSearch(selectedLabel);
      }}
    >
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
        {selectedLabel || "Select or type a category..."}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type a new category..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandGroup>
              {categories
                .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
                .map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.name}
                    onSelect={() => {
                      onSelectExisting(category);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        category.id === categoryId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {category.name}
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
