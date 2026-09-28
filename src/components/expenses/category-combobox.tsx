"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteExpenseCategory } from "@/actions/expenses";

export type CategoryOption = { id: number; name: string };

export function CategoryCombobox({
  categories,
  categoryId,
  customCategory,
  onSelectExisting,
  onSelectCustom,
  onClearSelection,
}: {
  categories: CategoryOption[];
  categoryId: number | null;
  customCategory: string | null;
  onSelectExisting: (category: CategoryOption) => void;
  onSelectCustom: (name: string) => void;
  onClearSelection?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryOption | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  const visibleCategories = useMemo(
    () => categories.filter((c) => !deletedIds.includes(c.id)),
    [categories, deletedIds]
  );

  const selectedLabel = useMemo(() => {
    if (categoryId) return visibleCategories.find((c) => c.id === categoryId)?.name ?? "";
    if (customCategory) return customCategory;
    return "";
  }, [categoryId, customCategory, visibleCategories]);

  const exactMatch = visibleCategories.some(
    (c) => c.name.toLowerCase() === search.trim().toLowerCase()
  );

  async function handleDeleteCategory() {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteExpenseCategory(categoryToDelete.id);
      toast.success(`Category "${categoryToDelete.name}" deleted`);
      setDeletedIds((prev) => [...prev, categoryToDelete.id]);
      if (categoryId === categoryToDelete.id) {
        onClearSelection?.();
      }
      setCategoryToDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category");
      setCategoryToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
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
                {visibleCategories
                  .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
                  .map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      className="group flex items-center justify-between pr-1 cursor-pointer"
                      onSelect={() => {
                        onSelectExisting(category);
                        setSearch("");
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center min-w-0 flex-1 py-0.5">
                        <Check
                          className={cn(
                            "mr-2 size-4 shrink-0",
                            category.id === categoryId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{category.name}</span>
                      </div>
                      <button
                        type="button"
                        title={`Delete category "${category.name}"`}
                        aria-label={`Delete category ${category.name}`}
                        data-slot="command-shortcut"
                        className="size-6 ml-2 inline-flex items-center justify-center rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setOpen(false);
                          setCategoryToDelete(category);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
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

      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isDeleting) {
            setCategoryToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this category?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span>
                Are you sure you want to delete the category &ldquo;{categoryToDelete?.name}&rdquo;?
                This action cannot be undone.
              </span>
              <span className="block rounded-md bg-amber-500/10 p-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                Important: If any expenses are currently assigned to this category, it cannot be deleted.
                You must delete or change the category on those expenses first.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setCategoryToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCategory();
              }}
            >
              {isDeleting ? "Deleting..." : "Delete Category"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
