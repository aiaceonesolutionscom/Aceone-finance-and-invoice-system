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
import { expenseSchema, type ExpenseInput } from "@/lib/validation/expense";
import { createExpense } from "@/actions/expenses";

export function ExpenseForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { expenseName: "", amount: "" },
  });

  function onSubmit(values: ExpenseInput) {
    startTransition(async () => {
      try {
        await createExpense(values);
        toast.success("Expense added");
        form.reset({ expenseName: "", amount: "" });
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-w-lg items-start gap-3">
        <FormField
          control={form.control}
          name="expenseName"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="sr-only">Expense Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Salary - Designer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="w-40">
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
