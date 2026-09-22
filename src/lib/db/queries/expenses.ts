import { sql } from "drizzle-orm";
import type Decimal from "decimal.js";
import { db } from "@/lib/db";
import { money } from "@/lib/money";

export type ExpenseFilter = {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: number;
  limit?: number;
  offset?: number;
};

function buildConditions(filter: ExpenseFilter, alias = "e") {
  const conditions = [];
  const term = filter.search?.trim();
  if (term) {
    conditions.push(sql`${sql.raw(alias)}.expense_name ILIKE ${"%" + term + "%"}`);
  }
  if (filter.dateFrom) {
    conditions.push(sql`${sql.raw(alias)}.expense_date >= ${filter.dateFrom}`);
  }
  if (filter.dateTo) {
    conditions.push(sql`${sql.raw(alias)}.expense_date <= ${filter.dateTo}`);
  }
  if (filter.categoryId) {
    conditions.push(sql`${sql.raw(alias)}.category_id = ${filter.categoryId}`);
  }
  return conditions;
}

export async function listExpenses(filter: ExpenseFilter = {}) {
  const conditions = buildConditions(filter);
  const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
  const limitClause = filter.limit !== undefined ? sql`LIMIT ${filter.limit} OFFSET ${filter.offset ?? 0}` : sql``;

  const rows = await db.execute<{
    id: number;
    expense_name: string;
    amount: string;
    expense_date: string;
    expense_time: string | null;
    category_id: number | null;
    category_name: string | null;
    total_count: string;
  }>(sql`
    SELECT e.id, e.expense_name, e.amount, e.expense_date, e.expense_time,
      e.category_id, c.name AS category_name,
      COUNT(*) OVER() AS total_count
    FROM expenses e
    LEFT JOIN expense_categories c ON c.id = e.category_id
    ${whereClause}
    ORDER BY e.expense_date DESC, e.expense_time DESC NULLS LAST, e.id DESC
    ${limitClause}
  `);

  return {
    rows: rows.rows.map((row) => ({
      id: row.id,
      expenseName: row.expense_name,
      amount: money(row.amount),
      expenseDate: row.expense_date,
      expenseTime: row.expense_time,
      categoryId: row.category_id,
      categoryName: row.category_name,
    })),
    total: rows.rows.length > 0 ? Number(rows.rows[0].total_count) : 0,
  };
}

export async function getExpenseTotal(filter: ExpenseFilter = {}) {
  const conditions = buildConditions(filter, "expenses");
  const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const [{ total }] = (
    await db.execute<{ total: string }>(sql`
      SELECT COALESCE(SUM(amount), 0) AS total FROM expenses ${whereClause}
    `)
  ).rows;

  return money(total);
}

/** Groups expenses by exact name and sums amounts — the "Top Expenses" / expense analysis view. */
export async function getExpenseBreakdown(filter: ExpenseFilter = {}) {
  const conditions = buildConditions(filter, "expenses");
  const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const rows = await db.execute<{ expense_name: string; total: string }>(sql`
    SELECT expense_name, SUM(amount) AS total
    FROM expenses
    ${whereClause}
    GROUP BY expense_name
    ORDER BY total DESC
  `);

  return rows.rows.map((row) => ({ expenseName: row.expense_name, total: money(row.total) }));
}

/** Groups expenses by category and sums amounts. */
export async function getExpenseCategoryBreakdown(filter: ExpenseFilter = {}) {
  const conditions = buildConditions(filter);
  const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const rows = await db.execute<{ category_id: number | null; category_name: string | null; total: string }>(sql`
    SELECT e.category_id, COALESCE(c.name, 'Uncategorized') AS category_name, SUM(e.amount) AS total
    FROM expenses e
    LEFT JOIN expense_categories c ON c.id = e.category_id
    ${whereClause}
    GROUP BY e.category_id, COALESCE(c.name, 'Uncategorized')
    ORDER BY total DESC
  `);

  return rows.rows.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name ?? "Uncategorized",
    total: money(row.total),
  }));
}

export type CategoryExpenseItem = {
  expenseName: string;
  total: Decimal;
  count: number;
};

export type CategoryExpenseGroup = {
  categoryId: number | null;
  categoryName: string;
  total: Decimal;
  items: CategoryExpenseItem[];
};

/**
 * Returns expenses grouped by category, with each category containing its itemized expenses
 * (e.g. Designer Salary, Designer AI Tools) sorted by total amount descending.
 */
export async function getCategoryGroupedExpenses(filter: ExpenseFilter = {}): Promise<CategoryExpenseGroup[]> {
  const conditions = buildConditions(filter);
  const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const rows = await db.execute<{
    category_id: number | null;
    category_name: string | null;
    expense_name: string;
    total: string;
    count: string;
  }>(sql`
    SELECT
      e.category_id,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      e.expense_name,
      SUM(e.amount) AS total,
      COUNT(e.id) AS count
    FROM expenses e
    LEFT JOIN expense_categories c ON c.id = e.category_id
    ${whereClause}
    GROUP BY e.category_id, c.name, e.expense_name
    ORDER BY category_name ASC, total DESC
  `);

  const groupMap = new Map<string, CategoryExpenseGroup>();

  for (const row of rows.rows) {
    const key = row.category_id !== null ? String(row.category_id) : "uncategorized";
    const categoryName = row.category_name ?? "Uncategorized";
    const itemTotal = money(row.total);
    const count = Number(row.count);

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        categoryId: row.category_id,
        categoryName,
        total: money(0),
        items: [],
      });
    }

    const group = groupMap.get(key)!;
    group.total = group.total.plus(itemTotal);
    group.items.push({
      expenseName: row.expense_name,
      total: itemTotal,
      count,
    });
  }

  return Array.from(groupMap.values()).sort((a, b) => (b.total.gt(a.total) ? 1 : -1));
}

export async function getExpenseById(id: number) {
  const [expense] = await db.execute<{
    id: number;
    expense_name: string;
    amount: string;
    expense_date: string;
    expense_time: string | null;
    category_id: number | null;
    category_name: string | null;
  }>(sql`
    SELECT e.id, e.expense_name, e.amount, e.expense_date, e.expense_time, e.category_id, c.name AS category_name
    FROM expenses e
    LEFT JOIN expense_categories c ON c.id = e.category_id
    WHERE e.id = ${id}
  `).then((r) => r.rows);
  return expense
    ? {
        id: expense.id,
        expenseName: expense.expense_name,
        amount: money(expense.amount),
        expenseDate: expense.expense_date,
        expenseTime: expense.expense_time,
        categoryId: expense.category_id,
        categoryName: expense.category_name,
      }
    : null;
}
