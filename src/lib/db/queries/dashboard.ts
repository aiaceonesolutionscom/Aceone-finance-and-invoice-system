import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { money } from "@/lib/money";

export async function getDashboardSummary() {
  const [{ total_invoiced, total_paid }] = (
    await db.execute<{ total_invoiced: string; total_paid: string }>(sql`
      SELECT
        COALESCE(SUM(i.current_invoice_total), 0) AS total_invoiced,
        COALESCE((SELECT SUM(amount) FROM payments), 0) AS total_paid
      FROM invoices i
      WHERE i.status != 'CANCELLED'
    `)
  ).rows;

  const [{ total_expenses }] = (
    await db.execute<{ total_expenses: string }>(sql`SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM expenses`)
  ).rows;

  const [{ unpaid_count, partial_count, paid_count }] = (
    await db.execute<{ unpaid_count: string; partial_count: string; paid_count: string }>(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'UNPAID') AS unpaid_count,
        COUNT(*) FILTER (WHERE status = 'PARTIALLY_PAID') AS partial_count,
        COUNT(*) FILTER (WHERE status = 'PAID') AS paid_count
      FROM invoices
    `)
  ).rows;

  const recentInvoices = (
    await db.execute<{
      id: number;
      invoice_number: string;
      customer_name: string;
      current_invoice_total: string;
      status: string;
      invoice_date: string;
    }>(sql`
      SELECT i.id, i.invoice_number, c.customer_name, i.current_invoice_total, i.status, i.invoice_date
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      ORDER BY i.created_at DESC
      LIMIT 5
    `)
  ).rows;

  const recentPayments = (
    await db.execute<{
      id: number;
      invoice_id: number;
      invoice_number: string;
      customer_name: string;
      amount: string;
      payment_date: string;
    }>(sql`
      SELECT p.id, p.invoice_id, i.invoice_number, c.customer_name, p.amount, p.payment_date
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      JOIN customers c ON c.id = p.customer_id
      ORDER BY p.created_at DESC
      LIMIT 5
    `)
  ).rows;

  const recentExpenses = (
    await db.execute<{ id: number; expense_name: string; amount: string; expense_date: string }>(sql`
      SELECT id, expense_name, amount, expense_date FROM expenses ORDER BY created_at DESC LIMIT 5
    `)
  ).rows;

  const outstandingCustomers = (
    await db.execute<{ id: number; customer_name: string; outstanding: string }>(sql`
      SELECT c.id, c.customer_name, (COALESCE(inv.total, 0) - COALESCE(pay.total, 0)) AS outstanding
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, SUM(current_invoice_total) AS total FROM invoices WHERE status != 'CANCELLED' GROUP BY customer_id
      ) inv ON inv.customer_id = c.id
      LEFT JOIN (
        SELECT i.customer_id, SUM(p.amount) AS total FROM payments p JOIN invoices i ON i.id = p.invoice_id GROUP BY i.customer_id
      ) pay ON pay.customer_id = c.id
      WHERE (COALESCE(inv.total, 0) - COALESCE(pay.total, 0)) > 0
      ORDER BY outstanding DESC
      LIMIT 5
    `)
  ).rows;

  const totalInvoiced = money(total_invoiced);
  const totalReceived = money(total_paid);
  const totalExpenses = money(total_expenses);

  return {
    totalInvoiced,
    totalReceived,
    totalOutstanding: totalInvoiced.minus(totalReceived),
    totalExpenses,
    profitLoss: totalInvoiced.minus(totalExpenses),
    unpaidCount: Number(unpaid_count),
    partialCount: Number(partial_count),
    paidCount: Number(paid_count),
    recentInvoices,
    recentPayments,
    recentExpenses,
    outstandingCustomers: outstandingCustomers.map((row) => ({
      id: row.id,
      customerName: row.customer_name,
      outstanding: money(row.outstanding),
    })),
  };
}
