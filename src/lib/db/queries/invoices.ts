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
  const siblingsByBatch = new Map<
    string,
    {
      invoiceId: number;
      invoiceNumber: string;
      amount: string;
      isOlderInvoice: boolean;
      isNewerInvoice: boolean;
      paymentMethod: string;
      paymentDate: string;
    }[]
  >();
  if (batchIds.length > 0) {
    const siblingRows = await db.execute<{
      batch_id: string;
      invoice_id: number;
      invoice_number: string;
      amount: string;
      payment_method: string;
      payment_date: string;
    }>(sql`
      SELECT p.batch_id, p.invoice_id, i.invoice_number, p.amount, p.payment_method, p.payment_date
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      WHERE p.batch_id IN ${batchIds} AND p.invoice_id != ${id}
    `);
    for (const row of siblingRows.rows) {
      const list = siblingsByBatch.get(row.batch_id) ?? [];
      list.push({
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoice_number,
        amount: row.amount,
        isOlderInvoice: row.invoice_id < id,
        isNewerInvoice: row.invoice_id > id,
        paymentMethod: row.payment_method,
        paymentDate: row.payment_date,
      });
      siblingsByBatch.set(row.batch_id, list);
    }
  }

  const batchTotals = new Map<string, string>();
  if (batchIds.length > 0) {
    const batchTotalRows = await db.execute<{ batch_id: string; total: string }>(sql`
      SELECT batch_id, SUM(amount::numeric) as total
      FROM payments
      WHERE batch_id IN ${batchIds}
      GROUP BY batch_id
    `);
    for (const row of batchTotalRows.rows) {
      batchTotals.set(row.batch_id, Number(row.total).toFixed(2));
    }
  }

  const customerInvoices = await db.execute<{
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
    WHERE i.customer_id = ${invoice.customerId}
      AND i.status != 'CANCELLED'
      AND i.id < ${id}
    ORDER BY i.id ASC
  `).catch(() => ({ rows: [] }));

  // Identify previous invoices that contributed to previous_outstanding_amount
  const contributingInvoiceIds = new Set<number>();
  const contributingPayments: {
    invoiceId: number;
    invoiceNumber: string;
    amount: string;
    isOlderInvoice: boolean;
    isNewerInvoice: boolean;
    paymentMethod: string;
    paymentDate: string;
  }[] = [];

  if (Number(invoice.previousOutstandingAmount || 0) > 0) {
    // Query payments on all previous invoices
    const prevPaymentRows = await db.execute<{
      id: number;
      invoice_id: number;
      invoice_number: string;
      amount: string;
      payment_method: string;
      payment_date: string;
      created_at: Date;
      batch_id: string | null;
    }>(sql`
      SELECT p.id, p.invoice_id, i.invoice_number, p.amount, p.payment_method, p.payment_date, p.created_at, p.batch_id
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      WHERE i.customer_id = ${invoice.customerId} AND i.id < ${id}
      ORDER BY p.id ASC
    `).catch(() => ({ rows: [] }));

    let needed = money(invoice.previousOutstandingAmount);

    // Walk previous invoices from newest to oldest
    for (let i = customerInvoices.rows.length - 1; i >= 0 && needed.gt(0); i--) {
      const row = customerInvoices.rows[i];
      const curRemaining = money(row.total).minus(money(row.paid));

      // Find payments on this previous invoice that belong to this invoice:
      // Either explicitly sharing a batchId, or unbatched and created on/after this invoice
      const relatedPayments = prevPaymentRows.rows.filter((p) => {
        if (p.invoice_id !== row.id) return false;
        if (p.batch_id && batchIds.includes(p.batch_id)) return true;
        // If it belongs to a different batch, it is NOT part of this invoice
        if (p.batch_id && !batchIds.includes(p.batch_id)) return false;
        const paymentCreated = new Date(p.created_at).getTime();
        const invoiceCreated = new Date(invoice.createdAt).getTime();
        return paymentCreated >= invoiceCreated;
      });

      const relatedPaidAmount = sumMoney(relatedPayments.map((p) => p.amount));
      const outstandingAtCreation = curRemaining.plus(relatedPaidAmount);

      if (outstandingAtCreation.gt(0)) {
        contributingInvoiceIds.add(row.id);
        needed = needed.minus(outstandingAtCreation);

        for (const rp of relatedPayments) {
          const isAlreadyInBatch = rp.batch_id && batchIds.includes(rp.batch_id);
          if (!isAlreadyInBatch) {
            contributingPayments.push({
              invoiceId: rp.invoice_id,
              invoiceNumber: rp.invoice_number,
              amount: rp.amount,
              isOlderInvoice: true,
              isNewerInvoice: false,
              paymentMethod: rp.payment_method,
              paymentDate: rp.payment_date,
            });
          }
        }
      }
    }
  }

  const paymentsWithSiblings = invoicePayments.map((p, idx) => {
    const siblings = p.batchId ? siblingsByBatch.get(p.batchId) ?? [] : [];
    const combinedSiblings = [...siblings];
    if (idx === invoicePayments.length - 1 && contributingPayments.length > 0) {
      for (const cp of contributingPayments) {
        if (!combinedSiblings.some((s) => s.invoiceId === cp.invoiceId && s.amount === cp.amount)) {
          combinedSiblings.push(cp);
        }
      }
    }

    const batchTotal = combinedSiblings.length > 0
      ? money(p.amount).plus(sumMoney(combinedSiblings.map((s) => s.amount))).toFixed(2)
      : p.batchId && batchTotals.has(p.batchId)
      ? batchTotals.get(p.batchId)!
      : p.amount;

    return {
      ...p,
      siblingInvoices: combinedSiblings,
      batchTotal,
    };
  });

  // Map how much was paid towards each previous invoice with this invoice
  const paidWithThisInvoiceByPrevId = new Map<number, string>();
  for (const p of paymentsWithSiblings) {
    for (const s of p.siblingInvoices) {
      if (s.isOlderInvoice) {
        const current = paidWithThisInvoiceByPrevId.get(s.invoiceId) ?? "0";
        paidWithThisInvoiceByPrevId.set(s.invoiceId, money(current).plus(money(s.amount)).toFixed(2));
      }
    }
  }

  const previousInvoices = customerInvoices.rows.map((row) => {
    const tot = money(row.total);
    const pd = money(row.paid);
    const rem = tot.minus(pd);
    const paidWithThis = paidWithThisInvoiceByPrevId.get(row.id) ?? "0.00";
    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date,
      total: tot.toFixed(2),
      paid: pd.toFixed(2),
      remaining: rem.gt(0) ? rem.toFixed(2) : "0.00",
      isContributedToThisInvoice: contributingInvoiceIds.has(row.id),
      amountPaidWithThisInvoice: paidWithThis,
    };
  });

  const previousRemaining = sumMoney(previousInvoices.map((p) => p.remaining));
  const totalAccountRemaining = remaining.plus(previousRemaining);

  const subsequentInvoices = await db.execute<{ invoice_number: string }>(sql`
    SELECT invoice_number
    FROM invoices
    WHERE customer_id = ${invoice.customerId}
      AND id > ${id}
      AND previous_outstanding_amount::numeric > 0
      AND status != 'CANCELLED'
    ORDER BY id ASC
  `).catch(() => ({ rows: [] }));
  const rolledIntoInvoice = subsequentInvoices.rows.length > 0
    ? subsequentInvoices.rows.map((r) => r.invoice_number).join(", ")
    : null;

  return {
    invoice: { ...invoice, status },
    items,
    payments: paymentsWithSiblings,
    paid,
    remaining,
    previousInvoices,
    previousRemaining,
    totalAccountRemaining,
    rolledIntoInvoice,
  };
}

export async function invoiceHasPayments(id: number): Promise<boolean> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(eq(payments.invoiceId, id));
  return count > 0;
}
