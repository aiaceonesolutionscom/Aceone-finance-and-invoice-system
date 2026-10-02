"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CategoryCombobox, type CategoryOption } from "@/components/expenses/category-combobox";
import { expenseSchema, type ExpenseInput } from "@/lib/validation/expense";
import { createExpense } from "@/actions/expenses";

function getNowDateTimeStrings() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

const getEmptyValues = (): ExpenseInput => {
  const now = getNowDateTimeStrings();
  return {
    expenseDate: now.date,
    expenseTime: now.time,
    expenseName: "",
    amount: "",
    categoryId: null,
    customCategory: null,
  };
};

export function ExpenseForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: getEmptyValues(),
  });

  const categoryId = form.watch("categoryId");
  const customCategory = form.watch("customCategory");

  function onSubmit(values: ExpenseInput) {
    startTransition(async () => {
      try {
        await createExpense(values);
        toast.success("Expense added");
        form.reset(getEmptyValues());
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-w-5xl flex-wrap items-start gap-3">
        <FormField
          control={form.control}
          name="expenseDate"
          render={({ field }) => (
            <FormItem className="w-38">
              <FormLabel className="sr-only">Date</FormLabel>
              <FormControl>
                <Input type="date" aria-label="Expense Date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expenseTime"
          render={({ field }) => (
            <FormItem className="w-32">
              <FormLabel className="sr-only">Time</FormLabel>
              <FormControl>
                <Input type="time" aria-label="Expense Time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expenseName"
          render={({ field }) => (
            <FormItem className="flex-1 basis-48">
              <FormLabel className="sr-only">Expense Details</FormLabel>
              <FormControl>
                <Input placeholder="Expense details (e.g. Office Rent, Software)..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customCategory"
          render={() => (
            <FormItem className="w-56">
              <FormLabel className="sr-only">Category</FormLabel>
              <FormControl>
                <CategoryCombobox
                  categories={categories}
                  categoryId={categoryId}
                  customCategory={customCategory}
                  onSelectExisting={(category) => {
                    form.setValue("categoryId", category.id);
                    form.setValue("customCategory", null);
                    form.clearErrors("customCategory");
                  }}
                  onSelectCustom={(name) => {
                    form.setValue("categoryId", null);
                    form.setValue("customCategory", name, { shouldValidate: true });
                  }}
                  onClearSelection={() => {
                    form.setValue("categoryId", null);
                    form.setValue("customCategory", null);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="w-36">
              <FormLabel className="sr-only">Amount</FormLabel>
              <FormControl>
                <Input placeholder="Amount" inputMode="decimal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          Add Expense
        </Button>
      </form>
    </Form>
  );
}
