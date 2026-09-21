import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { money } from "@/lib/money";

export type ExpenseFilter = {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

function buildConditions(filter: ExpenseFilter) {
  const conditions = [];
  const term = filter.search?.trim();
  if (term) {
    conditions.push(sql`expense_name ILIKE ${"%" + term + "%"}`);
  }
  if (filter.dateFrom) {
    conditions.push(sql`expense_date >= ${filter.dateFrom}`);
  }
  if (filter.dateTo) {
    conditions.push(sql`expense_date <= ${filter.dateTo}`);
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
    total_count: string;
  }>(sql`
    SELECT id, expense_name, amount, expense_date, expense_time, COUNT(*) OVER() AS total_count
    FROM expenses
    ${whereClause}
    ORDER BY expense_date DESC, expense_time DESC NULLS LAST, id DESC
    ${limitClause}
  `);

  return {
    rows: rows.rows.map((row) => ({
      id: row.id,
      expenseName: row.expense_name,
      amount: money(row.amount),
      expenseDate: row.expense_date,
      expenseTime: row.expense_time,
    })),
    total: rows.rows.length > 0 ? Number(rows.rows[0].total_count) : 0,
  };
}

export async function getExpenseTotal(filter: ExpenseFilter = {}) {
  const conditions = buildConditions(filter);
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
  const conditions = buildConditions(filter);
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

export async function getExpenseById(id: number) {
  const [expense] = await db.execute<{
    id: number;
    expense_name: string;
    amount: string;
    expense_date: string;
    expense_time: string | null;
  }>(sql`SELECT id, expense_name, amount, expense_date, expense_time FROM expenses WHERE id = ${id}`).then((r) => r.rows);
  return expense
    ? {
        id: expense.id,
        expenseName: expense.expense_name,
        amount: money(expense.amount),
        expenseDate: expense.expense_date,
        expenseTime: expense.expense_time,
      }
    : null;
}
