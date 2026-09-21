import { z } from "zod";
import { positiveMoneyStringSchema } from "./money";

export const expenseSchema = z.object({
  expenseName: z.string().trim().min(1, "Expense name is required"),
  amount: positiveMoneyStringSchema,
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
