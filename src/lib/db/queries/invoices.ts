import { desc, eq, sql } from "drizzle-orm";
import { db, type Tx } from "@/lib/db";
import { invoiceItems, invoices, payments } from "@/lib/db/schema";
import { money, sumMoney } from "@/lib/money";
import { computeStatus, type InvoiceStatus } from "@/lib/invoice-status";

export type PreviousOutstandingInvoice = {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  total: ReturnType<typeof money>;
  paid: ReturnType<typeof money>;
  remaining: ReturnType<typeof money>;
};

/**
 * Finds the customer's other (non-cancelled) invoices that still have a
 * remaining balance. Used both to preview "Previous Outstanding" on the
 * invoice-create form and, authoritatively, inside createInvoice itself —
 * always recomputed server-side, never trusted from client input.
 */
export async function getPreviousOutstanding(
  executor: Tx | typeof db,
  customerId: number,
  excludeInvoiceId?: number
): Promise<{
  invoices: PreviousOutstandingInvoice[];
  previousOutstandingAmount: ReturnType<typeof money>;
}> {
  const rows = await executor.execute<{
    id: number;
    invoice_number: string;
    invoice_date: string;
    total: string;
    paid: string;
  }>(sql`
    SELECT
      i.id, i.invoice_number, i.invoice_date, i.current_invoice_total AS total,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) AS paid
    FROM invoices i
    WHERE i.customer_id = ${customerId}
      AND i.status != 'CANCELLED'
      ${excludeInvoiceId ? sql`AND i.id != ${excludeInvoiceId}` : sql``}
    ORDER BY i.id ASC
  `);

  const withRemaining = rows.rows
    .map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date,
      total: money(row.total),
      paid: money(row.paid),
      remaining: money(row.total).minus(money(row.paid)),
    }))
    .filter((row) => row.remaining.gt(0));

  return {
    invoices: withRemaining,
    previousOutstandingAmount: sumMoney(withRemaining.map((r) => r.remaining)),
  };
}

export type InvoiceListFilter = {
  status?: string;
  search?: string;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export async function listInvoices(filter: InvoiceListFilter = {}) {
  const conditions = [];
  if (filter.status) {
    conditions.push(sql`i.status = ${filter.status}`);
  }
  if (filter.customerId) {
    conditions.push(sql`i.customer_id = ${filter.customerId}`);
  }
  if (filter.dateFrom) {
    conditions.push(sql`i.invoice_date >= ${filter.dateFrom}`);
  }
  if (filter.dateTo) {
    conditions.push(sql`i.invoice_date <= ${filter.dateTo}`);
  }
  const term = filter.search?.trim();
  if (term) {
    const like = `%${term}%`;
    conditions.push(sql`(i.invoice_number ILIKE ${like} OR c.customer_name ILIKE ${like} OR c.company_name ILIKE ${like})`);
  }
  const whereClause = conditions.length
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  const limitClause = filter.limit !== undefined ? sql`LIMIT ${filter.limit} OFFSET ${filter.offset ?? 0}` : sql``;

  const rows = await db.execute<{
    id: number;
    invoice_number: string;
    invoice_date: string;
    customer_id: number;
    customer_name: string;
    company_name: string | null;
    current_invoice_total: string;
    previous_outstanding_amount: string;
    total_amount_due: string;
    status: string;
    paid: string;
    total_count: string;
  }>(sql`
    SELECT
      i.id, i.invoice_number, i.invoice_date, i.customer_id,
      c.customer_name, c.company_name,
      i.current_invoice_total, i.previous_outstanding_amount, i.total_amount_due, i.status,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) AS paid,
      COUNT(*) OVER() AS total_count
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    ${whereClause}
    ORDER BY i.invoice_date DESC, i.id DESC
    ${limitClause}
  `);

  const total = rows.rows.length > 0 ? Number(rows.rows[0].total_count) : 0;

  const mapped = rows.rows.map((row) => {
    const paid = money(row.paid);
    const remaining = money(row.current_invoice_total).minus(paid);
    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date,
      customerId: row.customer_id,
      customerName: row.customer_name,
      companyName: row.company_name,
      currentInvoiceTotal: money(row.current_invoice_total),
      previousOutstandingAmount: money(row.previous_outstanding_amount),
      totalAmountDue: money(row.total_amount_due),
      status: computeStatus({ currentStatus: row.status as InvoiceStatus, paid, remaining }),
      paid,
      remaining,
    };
  });

  return { rows: mapped, total };
}

export async function getInvoiceById(id: number) {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!invoice) return null;

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.id);

  const invoicePayments = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, id))
    .orderBy(desc(payments.paymentDate), desc(payments.paymentTime));

  const paid = sumMoney(invoicePayments.map((p) => p.amount));
  const remaining = money(invoice.currentInvoiceTotal).minus(paid);
  const status = computeStatus({ currentStatus: invoice.status, paid, remaining });

  // For any payment that was part of a multi-invoice "Record Payment" action,
  // look up what else that same batch paid — so the history can show
  // "also paid INV-X (amount)" instead of looking like an isolated payment.
  const batchIds = [...new Set(invoicePayments.map((p) => p.batchId).filter((b): b is string => !!b))];
  const siblingsByBatch = new Map<string, { invoiceNumber: string; amount: string }[]>();
  if (batchIds.length > 0) {
    const siblingRows = await db.execute<{ batch_id: string; invoice_number: string; amount: string }>(sql`
      SELECT p.batch_id, i.invoice_number, p.amount
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      WHERE p.batch_id IN ${batchIds} AND p.invoice_id != ${id}
    `);
    for (const row of siblingRows.rows) {
      const list = siblingsByBatch.get(row.batch_id) ?? [];
      list.push({ invoiceNumber: row.invoice_number, amount: row.amount });
      siblingsByBatch.set(row.batch_id, list);
    }
  }

  const paymentsWithSiblings = invoicePayments.map((p) => ({
    ...p,
    siblingInvoices: p.batchId ? siblingsByBatch.get(p.batchId) ?? [] : [],
  }));

  return { invoice: { ...invoice, status }, items, payments: paymentsWithSiblings, paid, remaining };
}

export async function invoiceHasPayments(id: number): Promise<boolean> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(eq(payments.invoiceId, id));
  return count > 0;
}
