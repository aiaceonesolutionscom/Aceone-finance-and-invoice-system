import { desc, sql } from "drizzle-orm";
import { db, type Tx } from "@/lib/db";
import { expenseCategories } from "@/lib/db/schema";

export async function listExpenseCategories() {
  return db.select().from(expenseCategories).orderBy(desc(expenseCategories.createdAt));
}

/**
 * Upserts an expense category by case-insensitive name — same pattern as
 * upsertServiceByName for invoice services. Only the name is ever synced.
 */
export async function upsertExpenseCategoryByName(
  executor: Tx | typeof db,
  rawName: string
): Promise<{ id: number; name: string }> {
  const name = rawName.trim();

  const inserted = await executor.execute<{ id: number; name: string }>(sql`
    INSERT INTO expense_categories (name)
    VALUES (${name})
    ON CONFLICT (lower(name)) DO NOTHING
    RETURNING id, name
  `);

  if (inserted.rows[0]) {
    return inserted.rows[0];
  }

  const existing = await executor.execute<{ id: number; name: string }>(sql`
    SELECT id, name FROM expense_categories WHERE lower(name) = lower(${name}) LIMIT 1
  `);

  const row = existing.rows[0];
  if (!row) {
    throw new Error(`Failed to upsert expense category "${name}"`);
  }
  return row;
}
