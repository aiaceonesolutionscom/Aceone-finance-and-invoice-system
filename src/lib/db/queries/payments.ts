import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { money } from "@/lib/money";

export type PaymentSortOption =
  | "latest"
  | "oldest"
  | "amount_desc"
  | "amount_asc"
  | "customer_asc";

export type PaymentListFilter = {
  search?: string;
  customerId?: number;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  sort?: PaymentSortOption | string;
};

function buildConditions(filter: PaymentListFilter) {
  const conditions = [];
  const term = filter.search?.trim();
  if (term) {
    const like = `%${term}%`;
    conditions.push(sql`(c.customer_name ILIKE ${like} OR i.invoice_number ILIKE ${like} OR p.reference ILIKE ${like})`);
  }
  if (filter.customerId) {
    conditions.push(sql`p.customer_id = ${filter.customerId}`);
  }
  if (filter.paymentMethod) {
    conditions.push(sql`p.payment_method = ${filter.paymentMethod}`);
  }
  if (filter.dateFrom) {
    conditions.push(sql`p.payment_date >= ${filter.dateFrom}`);
  }
  if (filter.dateTo) {
    conditions.push(sql`p.payment_date <= ${filter.dateTo}`);
  }
  return conditions;
}

export async function listAllPayments(filter: PaymentListFilter | string = {}) {
  const normalized: PaymentListFilter = typeof filter === "string" ? { search: filter } : filter;
  const conditions = buildConditions(normalized);
  const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
  const limitClause = normalized.limit !== undefined ? sql`LIMIT ${normalized.limit} OFFSET ${normalized.offset ?? 0}` : sql``;

  let orderByClause = sql`ORDER BY p.payment_date DESC, p.payment_time DESC NULLS LAST, p.created_at DESC, p.id DESC`;
  if (normalized.sort === "oldest") {
    orderByClause = sql`ORDER BY p.payment_date ASC, p.payment_time ASC NULLS LAST, p.created_at ASC, p.id ASC`;
  } else if (normalized.sort === "amount_desc") {
    orderByClause = sql`ORDER BY p.amount DESC, p.payment_date DESC, p.id DESC`;
  } else if (normalized.sort === "amount_asc") {
    orderByClause = sql`ORDER BY p.amount ASC, p.payment_date DESC, p.id DESC`;
  } else if (normalized.sort === "customer_asc") {
    orderByClause = sql`ORDER BY c.customer_name ASC, p.payment_date DESC, p.id DESC`;
  }

  const rows = await db.execute<{
    id: number;
    invoice_id: number;
    invoice_number: string;
    customer_id: number;
    customer_name: string;
    company_name: string | null;
    amount: string;
    payment_date: string;
    payment_time: string | null;
    payment_method: string;
    reference: string | null;
    total_count: string;
  }>(sql`
    SELECT
      p.id, p.invoice_id, i.invoice_number, p.customer_id, c.customer_name, c.company_name,
      p.amount, p.payment_date, p.payment_time, p.payment_method, p.reference,
      COUNT(*) OVER() AS total_count
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    JOIN customers c ON c.id = p.customer_id
    ${whereClause}
    ${orderByClause}
    ${limitClause}
  `);

  return {
    rows: rows.rows,
    total: rows.rows.length > 0 ? Number(rows.rows[0].total_count) : 0,
  };
}

export async function getPaymentMethodBreakdown(filter: PaymentListFilter = {}) {
  const conditions = buildConditions(filter);
  const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const rows = await db.execute<{ payment_method: string; total: string }>(sql`
    SELECT p.payment_method, SUM(p.amount) AS total
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    JOIN customers c ON c.id = p.customer_id
    ${whereClause}
    GROUP BY p.payment_method
    ORDER BY total DESC
  `);

  return rows.rows.map((row) => ({ method: row.payment_method, total: money(row.total) }));
}

/** Sum of all matching payments regardless of pagination — for a "Total Payments Received" card. */
export async function getPaymentsGrandTotal(filter: PaymentListFilter = {}) {
  const conditions = buildConditions(filter);
  const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const [{ total }] = (
    await db.execute<{ total: string }>(sql`
      SELECT COALESCE(SUM(p.amount), 0) AS total
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      JOIN customers c ON c.id = p.customer_id
      ${whereClause}
    `)
  ).rows;

  return money(total);
}
