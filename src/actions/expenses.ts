"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { expenseSchema, type ExpenseInput } from "@/lib/validation/expense";
import { logAudit } from "@/lib/audit";

function nowDateTime() {
  const now = new Date();
  const expenseDate = now.toISOString().slice(0, 10);
  const expenseTime = now.toTimeString().slice(0, 8);
  return { expenseDate, expenseTime };
}

export async function createExpense(input: ExpenseInput) {
  const parsed = expenseSchema.parse(input);
  const { expenseDate, expenseTime } = nowDateTime();

  const [created] = await db
    .insert(expenses)
    .values({ expenseName: parsed.expenseName, amount: parsed.amount, expenseDate, expenseTime })
    .returning();

  await logAudit(db, { action: "expense.created", entity: "expense", entityId: created.id, details: { expenseName: created.expenseName, amount: created.amount } });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return created;
}

export async function updateExpense(id: number, input: ExpenseInput) {
  const parsed = expenseSchema.parse(input);
  const [updated] = await db
    .update(expenses)
    .set({ expenseName: parsed.expenseName, amount: parsed.amount, updatedAt: new Date() })
    .where(eq(expenses.id, id))
    .returning();

  await logAudit(db, { action: "expense.updated", entity: "expense", entityId: id, details: { expenseName: updated.expenseName, amount: updated.amount } });

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
