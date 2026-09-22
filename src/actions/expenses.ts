"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, type Tx } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { expenseSchema, type ExpenseInput } from "@/lib/validation/expense";
import { upsertExpenseCategoryByName } from "@/lib/db/queries/expense-categories";
import { logAudit } from "@/lib/audit";

function nowDateTime() {
  const now = new Date();
  const expenseDate = now.toISOString().slice(0, 10);
  const expenseTime = now.toTimeString().slice(0, 8);
  return { expenseDate, expenseTime };
}

async function resolveCategoryId(tx: Tx, parsed: ExpenseInput) {
  if (parsed.categoryId) return parsed.categoryId;
  const category = await upsertExpenseCategoryByName(tx, parsed.customCategory!);
  return category.id;
}

export async function createExpense(input: ExpenseInput) {
  const parsed = expenseSchema.parse(input);
  const { expenseDate, expenseTime } = nowDateTime();

  const created = await db.transaction(async (tx) => {
    const categoryId = await resolveCategoryId(tx, parsed);
    const [row] = await tx
      .insert(expenses)
      .values({ expenseName: parsed.expenseName, amount: parsed.amount, expenseDate, expenseTime, categoryId })
      .returning();

    await logAudit(tx, { action: "expense.created", entity: "expense", entityId: row.id, details: { expenseName: row.expenseName, amount: row.amount } });
    return row;
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return created;
}

export async function updateExpense(id: number, input: ExpenseInput) {
  const parsed = expenseSchema.parse(input);

  const updated = await db.transaction(async (tx) => {
    const categoryId = await resolveCategoryId(tx, parsed);
    const [row] = await tx
      .update(expenses)
      .set({ expenseName: parsed.expenseName, amount: parsed.amount, categoryId, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();

    await logAudit(tx, { action: "expense.updated", entity: "expense", entityId: id, details: { expenseName: row.expenseName, amount: row.amount } });
    return row;
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return updated;
}

export async function deleteExpense(id: number) {
  await db.delete(expenses).where(eq(expenses.id, id));
  await logAudit(db, { action: "expense.deleted", entity: "expense", entityId: id });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
