"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, type Tx } from "@/lib/db";
import { expenses, expenseCategories } from "@/lib/db/schema";
import { expenseSchema, type ExpenseInput } from "@/lib/validation/expense";
import { upsertExpenseCategoryByName } from "@/lib/db/queries/expense-categories";
import { logAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

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
  const user = await requireAuth();
  const parsed = expenseSchema.parse(input);
  const { expenseDate, expenseTime } = nowDateTime();

  const created = await db.transaction(async (tx) => {
    const categoryId = await resolveCategoryId(tx, parsed);
    const [row] = await tx
      .insert(expenses)
      .values({
        expenseName: parsed.expenseName,
        amount: parsed.amount,
        expenseDate,
        expenseTime,
        categoryId,
        createdBy: user.email,
      })
      .returning();

    await logAudit(tx, { action: "expense.created", entity: "expense", entityId: row.id, details: { expenseName: row.expenseName, amount: row.amount } });
    return row;
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return created;
}

export async function updateExpense(id: number, input: ExpenseInput) {
  await requireAuth();
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
  await requireAuth();
  await db.delete(expenses).where(eq(expenses.id, id));
  await logAudit(db, { action: "expense.deleted", entity: "expense", entityId: id });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpenseCategory(id: number) {
  await requireAuth();

  const [category] = await db
    .select({ name: expenseCategories.name })
    .from(expenseCategories)
    .where(eq(expenseCategories.id, id))
    .limit(1);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expenses)
    .where(eq(expenses.categoryId, id));

  if (count > 0) {
    throw new Error(
      `Cannot delete category "${category?.name ?? "this category"}" because it is currently used by ${count} expense(s). Please delete or reassign those expenses first.`
    );
  }

  try {
    await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
  } catch (error) {
    if (
      error instanceof Error &&
      (/foreign key/i.test(error.message) ||
        /violates foreign key/i.test(String((error as any).cause?.message)))
    ) {
      throw new Error(
        `Cannot delete category "${category?.name ?? "this category"}" because existing expenses are assigned to it.`
      );
    }
    throw error;
  }

  await logAudit(db, {
    action: "expense_category.deleted",
    entity: "expense_category",
    entityId: id,
    details: { name: category?.name },
  });

  revalidatePath("/expenses");
  revalidatePath("/reports/expenses");
  revalidatePath("/dashboard");
}

