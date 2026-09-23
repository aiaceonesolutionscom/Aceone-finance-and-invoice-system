import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { money } from "@/lib/money";

export type ReportDateFilter = { dateFrom?: string; dateTo?: string };

/** Outstanding / Receivables report — every non-cancelled invoice with remaining > 0. */
export async function getOutstandingInvoices(
  filter: { customerId?: number; status?: string; limit?: number; offset?: number } = {}
) {
  const conditions = [sql`i.status NOT IN ('CANCELLED', 'PAID')`];
  if (filter.customerId) conditions.push(sql`i.customer_id = ${filter.customerId}`);
  if (filter.status) conditions.push(sql`i.status = ${filter.status}`);
  const limitClause = filter.limit !== undefined ? sql`LIMIT ${filter.limit} OFFSET ${filter.offset ?? 0}` : sql``;

  const base = sql`
    SELECT i.id, i.invoice_number, i.invoice_date, i.customer_id, c.customer_name,
      i.current_invoice_total, i.status,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) AS paid,
      i.current_invoice_total - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) AS remaining
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE ${sql.join(conditions, sql` AND `)}
  `;

  const rows = await db.execute<{
    id: number;
    invoice_number: string;
    invoice_date: string;
    customer_id: number;
    customer_name: string;
    current_invoice_total: string;
    status: string;
    paid: string;
    remaining: string;
    total_count: string;
  }>(sql`
    SELECT sub.*, COUNT(*) OVER() AS total_count
    FROM (${base}) sub
    WHERE remaining > 0
    ORDER BY invoice_date ASC
    ${limitClause}
  `);

  const invoices = rows.rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    customerId: row.customer_id,
    customerName: row.customer_name,
    total: money(row.current_invoice_total),
    paid: money(row.paid),
    remaining: money(row.remaining),
    status: row.status,
  }));

  // totalOutstanding is a grand total across all matching invoices, not just this page.
  const grandTotalRows = await db.execute<{ total: string }>(sql`
    SELECT COALESCE(SUM(remaining), 0) AS total FROM (${base}) sub WHERE remaining > 0
  `);

  return {
    invoices,
    total: rows.rows.length > 0 ? Number(rows.rows[0].total_count) : 0,
    totalOutstanding: money(grandTotalRows.rows[0].total),
  };
}

/** Customer-wise revenue: sum of billed invoice totals per customer for a period. */
export async function getCustomerRevenue(filter: ReportDateFilter = {}) {
  const conditions = [sql`i.status != 'CANCELLED'`];
  if (filter.dateFrom) conditions.push(sql`i.invoice_date >= ${filter.dateFrom}`);
  if (filter.dateTo) conditions.push(sql`i.invoice_date <= ${filter.dateTo}`);

  const rows = await db.execute<{ customer_id: number; customer_name: string; total: string }>(sql`
    SELECT c.id AS customer_id, c.customer_name, SUM(i.current_invoice_total) AS total
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE ${sql.join(conditions, sql` AND `)}
    GROUP BY c.id, c.customer_name
    ORDER BY total DESC
  `);

  return rows.rows.map((row) => ({
    customerId: row.customer_id,
    customerName: row.customer_name,
    total: money(row.total),
  }));
}

/** Customer statement — a running debit/credit ledger from invoices + payments. */
export async function getCustomerStatement(customerId: number, filter: ReportDateFilter = {}) {
  const invoiceConditions = [sql`customer_id = ${customerId}`, sql`status != 'CANCELLED'`];
  if (filter.dateFrom) invoiceConditions.push(sql`invoice_date >= ${filter.dateFrom}`);
  if (filter.dateTo) invoiceConditions.push(sql`invoice_date <= ${filter.dateTo}`);

  const invoiceRows = await db.execute<{ date: string; invoice_number: string; amount: string; created_at: string }>(sql`
    SELECT invoice_date AS date, invoice_number, current_invoice_total AS amount, created_at
    FROM invoices
    WHERE ${sql.join(invoiceConditions, sql` AND `)}
  `);

  const paymentConditions = [sql`p.customer_id = ${customerId}`, sql`inv.status != 'CANCELLED'`];
  if (filter.dateFrom) paymentConditions.push(sql`p.payment_date >= ${filter.dateFrom}`);
  if (filter.dateTo) paymentConditions.push(sql`p.payment_date <= ${filter.dateTo}`);

  const paymentRows = await db.execute<{ date: string; amount: string; payment_method: string; created_at: string }>(sql`
    SELECT p.payment_date AS date, p.amount, p.payment_method, p.created_at
    FROM payments p
    JOIN invoices inv ON inv.id = p.invoice_id
    WHERE ${sql.join(paymentConditions, sql` AND `)}
  `);

  type Entry = { date: string; description: string; debit: string | null; credit: string | null; sortKey: string };
  const entries: Entry[] = [
    ...invoiceRows.rows.map((r) => ({
      date: r.date,
      description: `Invoice ${r.invoice_number}`,
      debit: r.amount,
      credit: null,
      sortKey: r.created_at,
    })),
    ...paymentRows.rows.map((r) => ({
      date: r.date,
      description: `Payment (${r.payment_method})`,
      debit: null,
      credit: r.amount,
      sortKey: r.created_at,
    })),
  ].sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1));

  let balance = money(0);
  const withBalance = entries.map((entry) => {
    balance = balance.plus(money(entry.debit)).minus(money(entry.credit));
    return { ...entry, balance: balance.toFixed(2) };
  });

  return withBalance;
}

/** Profit/Loss: billed-revenue view (Total Invoiced - Total Expenses), plus cash-basis figures shown separately. */
export async function getProfitLoss(filter: ReportDateFilter = {}) {
  const invoiceConditions = [sql`status != 'CANCELLED'`];
  if (filter.dateFrom) invoiceConditions.push(sql`invoice_date >= ${filter.dateFrom}`);
  if (filter.dateTo) invoiceConditions.push(sql`invoice_date <= ${filter.dateTo}`);

  const [{ total_invoiced }] = (
    await db.execute<{ total_invoiced: string }>(
      sql`SELECT COALESCE(SUM(current_invoice_total), 0) AS total_invoiced FROM invoices WHERE ${sql.join(invoiceConditions, sql` AND `)}`
    )
  ).rows;

  const paymentConditions = [sql`inv.status != 'CANCELLED'`];
  if (filter.dateFrom) paymentConditions.push(sql`p.payment_date >= ${filter.dateFrom}`);
  if (filter.dateTo) paymentConditions.push(sql`p.payment_date <= ${filter.dateTo}`);
  const paymentWhere = sql`WHERE ${sql.join(paymentConditions, sql` AND `)}`;

  const [{ total_received }] = (
    await db.execute<{ total_received: string }>(
      sql`SELECT COALESCE(SUM(p.amount), 0) AS total_received FROM payments p JOIN invoices inv ON inv.id = p.invoice_id ${paymentWhere}`
    )
  ).rows;

  const expenseConditions = [];
  if (filter.dateFrom) expenseConditions.push(sql`expense_date >= ${filter.dateFrom}`);
  if (filter.dateTo) expenseConditions.push(sql`expense_date <= ${filter.dateTo}`);
  const expenseWhere = expenseConditions.length ? sql`WHERE ${sql.join(expenseConditions, sql` AND `)}` : sql``;

  const [{ total_expenses }] = (
    await db.execute<{ total_expenses: string }>(sql`SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM expenses ${expenseWhere}`)
  ).rows;

  const totalInvoiced = money(total_invoiced);
  const totalReceived = money(total_received);
  const totalExpenses = money(total_expenses);

  return {
    totalInvoiced,
    totalReceived,
    totalOutstanding: totalInvoiced.minus(totalReceived),
    totalExpenses,
    profitLoss: totalInvoiced.minus(totalExpenses),
  };
}

/** Combined business overview for a date range: revenue, collections, receivables, expenses, top customers, invoice/payment breakdowns. */
export async function getBusinessOverview(filter: ReportDateFilter = {}) {
  const pl = await getProfitLoss(filter);
  const customerRevenue = await getCustomerRevenue(filter);

  const invoiceConditions = [sql`status != 'CANCELLED'`];
  if (filter.dateFrom) invoiceConditions.push(sql`invoice_date >= ${filter.dateFrom}`);
  if (filter.dateTo) invoiceConditions.push(sql`invoice_date <= ${filter.dateTo}`);

  const [{ paid_count, partial_count, unpaid_count }] = (
    await db.execute<{ paid_count: string; partial_count: string; unpaid_count: string }>(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PAID') AS paid_count,
        COUNT(*) FILTER (WHERE status = 'PARTIALLY_PAID') AS partial_count,
        COUNT(*) FILTER (WHERE status = 'UNPAID') AS unpaid_count
      FROM invoices WHERE ${sql.join(invoiceConditions, sql` AND `)}
    `)
  ).rows;

  const paymentConditions = [sql`inv.status != 'CANCELLED'`];
  if (filter.dateFrom) paymentConditions.push(sql`p.payment_date >= ${filter.dateFrom}`);
  if (filter.dateTo) paymentConditions.push(sql`p.payment_date <= ${filter.dateTo}`);
  const paymentWhere = sql`WHERE ${sql.join(paymentConditions, sql` AND `)}`;

  const methodBreakdown = (
    await db.execute<{ payment_method: string; total: string }>(sql`
      SELECT p.payment_method, SUM(p.amount) AS total FROM payments p JOIN invoices inv ON inv.id = p.invoice_id ${paymentWhere} GROUP BY p.payment_method ORDER BY total DESC
    `)
  ).rows.map((r) => ({ method: r.payment_method, total: money(r.total) }));

  const expenseConditions = [];
  if (filter.dateFrom) expenseConditions.push(sql`expense_date >= ${filter.dateFrom}`);
  if (filter.dateTo) expenseConditions.push(sql`expense_date <= ${filter.dateTo}`);
  const expenseWhere = expenseConditions.length ? sql`WHERE ${sql.join(expenseConditions, sql` AND `)}` : sql``;

  const expenseBreakdown = (
    await db.execute<{ expense_name: string; total: string }>(sql`
      SELECT expense_name, SUM(amount) AS total FROM expenses ${expenseWhere} GROUP BY expense_name ORDER BY total DESC LIMIT 10
    `)
  ).rows.map((r) => ({ expenseName: r.expense_name, total: money(r.total) }));

  return {
    ...pl,
    invoiceCounts: { paid: Number(paid_count), partial: Number(partial_count), unpaid: Number(unpaid_count) },
    topCustomers: customerRevenue.slice(0, 10),
    paymentMethodBreakdown: methodBreakdown,
    majorExpenses: expenseBreakdown,
  };
}

export type ServicesReportFilter = {
  serviceId?: number;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

/** Services Sold Report: itemized services sold, customers, rates, and service-level revenue breakdown */
export async function getServicesReport(filter: ServicesReportFilter = {}) {
  const conditions = [sql`i.status != 'CANCELLED'`];
  if (filter.serviceId) conditions.push(sql`ii.service_id = ${filter.serviceId}`);
  if (filter.customerId) conditions.push(sql`i.customer_id = ${filter.customerId}`);
  if (filter.dateFrom) conditions.push(sql`i.invoice_date >= ${filter.dateFrom}`);
  if (filter.dateTo) conditions.push(sql`i.invoice_date <= ${filter.dateTo}`);

  const limitClause = filter.limit !== undefined ? sql`LIMIT ${filter.limit} OFFSET ${filter.offset ?? 0}` : sql``;

  // Itemized sales list
  const itemsQuery = sql`
    SELECT
      ii.id,
      ii.invoice_id,
      i.invoice_number,
      i.invoice_date,
      i.customer_id,
      c.customer_name,
      c.company_name,
      ii.service_id,
      ii.service_name_snapshot,
      ii.rate,
      ii.total,
      i.status AS invoice_status,
      COUNT(*) OVER() AS total_count
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    JOIN customers c ON c.id = i.customer_id
    LEFT JOIN services s ON s.id = ii.service_id
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY i.invoice_date DESC, ii.id DESC
    ${limitClause}
  `;

  // Aggregated breakdown per service
  const breakdownQuery = sql`
    SELECT
      COALESCE(s.name, ii.service_name_snapshot) AS service_name,
      ii.service_id,
      COUNT(ii.id) AS units_sold,
      COUNT(DISTINCT i.customer_id) AS unique_customers,
      SUM(ii.total) AS total_revenue,
      AVG(ii.rate) AS avg_rate
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    JOIN customers c ON c.id = i.customer_id
    LEFT JOIN services s ON s.id = ii.service_id
    WHERE ${sql.join(conditions, sql` AND `)}
    GROUP BY COALESCE(s.name, ii.service_name_snapshot), ii.service_id
    ORDER BY total_revenue DESC
  `;

  // Grand totals
  const totalsQuery = sql`
    SELECT
      COUNT(ii.id) AS total_items,
      COALESCE(SUM(ii.total), 0) AS total_revenue,
      COUNT(DISTINCT i.customer_id) AS total_customers,
      COUNT(DISTINCT ii.service_name_snapshot) AS distinct_services
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE ${sql.join(conditions, sql` AND `)}
  `;

  const [itemsRes, breakdownRes, totalsRes] = await Promise.all([
    db.execute<{
      id: number;
      invoice_id: number;
      invoice_number: string;
      invoice_date: string;
      customer_id: number;
      customer_name: string;
      company_name: string | null;
      service_id: number | null;
      service_name_snapshot: string;
      rate: string;
      total: string;
      invoice_status: string;
      total_count: string;
    }>(itemsQuery),
    db.execute<{
      service_name: string;
      service_id: number | null;
      units_sold: string;
      unique_customers: string;
      total_revenue: string;
      avg_rate: string;
    }>(breakdownQuery),
    db.execute<{
      total_items: string;
      total_revenue: string;
      total_customers: string;
      distinct_services: string;
    }>(totalsQuery),
  ]);

  const items = itemsRes.rows.map((row) => ({
    id: row.id,
    invoiceId: row.invoice_id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    customerId: row.customer_id,
    customerName: row.customer_name,
    companyName: row.company_name,
    serviceId: row.service_id,
    serviceName: row.service_name_snapshot,
    rate: money(row.rate),
    total: money(row.total),
    invoiceStatus: row.invoice_status,
  }));

  const breakdown = breakdownRes.rows.map((row) => ({
    serviceName: row.service_name,
    serviceId: row.service_id,
    unitsSold: Number(row.units_sold),
    uniqueCustomers: Number(row.unique_customers),
    totalRevenue: money(row.total_revenue),
    avgRate: money(row.avg_rate),
  }));

  const totals = {
    totalItems: Number(totalsRes.rows[0]?.total_items || 0),
    totalRevenue: money(totalsRes.rows[0]?.total_revenue || "0"),
    totalCustomers: Number(totalsRes.rows[0]?.total_customers || 0),
    distinctServices: Number(totalsRes.rows[0]?.distinct_services || 0),
  };

  const totalCount = itemsRes.rows.length > 0 ? Number(itemsRes.rows[0].total_count) : 0;

  return {
    items,
    breakdown,
    totals,
    totalCount,
  };
}
