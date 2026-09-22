"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CategoryCombobox, type CategoryOption } from "@/components/expenses/category-combobox";
import { updateExpense, deleteExpense } from "@/actions/expenses";
import { formatMoney, money, type MoneyInput } from "@/lib/money";

type Expense = {
  id: number;
  expenseName: string;
  // Server Components pass this down as a Decimal, but Decimal instances
  // don't survive the RSC serialization boundary — they arrive here as a
  // plain string (via Decimal's toJSON). Always renormalize with money()
  // rather than calling Decimal methods on it directly.
  amount: MoneyInput;
  expenseDate: string;
  expenseTime: string | null;
  categoryId: number | null;
  categoryName: string | null;
};

function EditExpenseDialog({ expense, categories }: { expense: Expense; categories: CategoryOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(expense.expenseName);
  const [amount, setAmount] = useState(money(expense.amount).toFixed(2));
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [customCategory, setCustomCategory] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label={`Edit ${expense.expenseName}`} />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Expense name" />
          <CategoryCombobox
            categories={categories}
            categoryId={categoryId}
            customCategory={customCategory}
            onSelectExisting={(category) => {
              setCategoryId(category.id);
              setCustomCategory(null);
            }}
            onSelectCustom={(name) => {
              setCategoryId(null);
              setCustomCategory(name);
            }}
          />
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" inputMode="decimal" />
        </div>
        <DialogFooter>
          <Button
            disabled={isPending || !name.trim() || !amount.trim() || (!categoryId && !customCategory)}
            onClick={() =>
              startTransition(async () => {
                try {
                  await updateExpense(expense.id, { expenseName: name, amount, categoryId, customCategory });
                  toast.success("Expense updated");
                  setOpen(false);
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to update");
                }
              })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteExpenseButton({ expense }: { expense: Expense }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label={`Delete ${expense.expenseName}`} />}>
        <Trash2 className="size-4 text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await deleteExpense(expense.id);
                  toast.success("Expense deleted");
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete");
                }
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ExpenseTable({ expenses, categories }: { expenses: Expense[]; categories: CategoryOption[] }) {
  if (expenses.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No expenses recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Expense Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>{expense.expenseDate}</TableCell>
              <TableCell>{expense.expenseTime ?? "—"}</TableCell>
              <TableCell>{expense.expenseName}</TableCell>
              <TableCell>
                {expense.categoryName ? <Badge variant="outline">{expense.categoryName}</Badge> : "—"}
              </TableCell>
              <TableCell className="text-right">{formatMoney(expense.amount)}</TableCell>
              <TableCell className="flex justify-end gap-1">
                <EditExpenseDialog expense={expense} categories={categories} />
                <DeleteExpenseButton expense={expense} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
