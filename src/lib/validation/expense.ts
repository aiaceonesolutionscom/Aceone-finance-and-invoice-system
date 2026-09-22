import { z } from "zod";
import { positiveMoneyStringSchema } from "./money";

export const expenseSchema = z
  .object({
    expenseName: z
      .string()
      .trim()
      .min(2, "Expense name must be at least 2 characters")
      .regex(/[a-zA-Z\u0600-\u06FF]/, "Expense name must contain letters, not just numbers"),
    amount: positiveMoneyStringSchema,
    categoryId: z.number().int().positive().nullable(),
    customCategory: z.string().trim().nullable(),
  })
  .refine((val) => val.categoryId !== null || !!val.customCategory, {
    message: "Pick a category or type a new one",
    path: ["customCategory"],
  });

export type ExpenseInput = z.infer<typeof expenseSchema>;
