import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, invoices, payments } from "@/lib/db/schema";
import { money } from "@/lib/money";
import { computeStatus } from "@/lib/invoice-status";

export async function listCustomers(search?: string, pagination?: { limit: number; offset: number }) {
  const term = search?.trim();
  const limitClause = pagination ? sql`LIMIT ${pagination.limit} OFFSET ${pagination.offset}` : sql``;
  const rows = await db.execute<{
    id: number;
    customer_name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    total_invoiced: string;
    total_paid: string;
    total_count: string;
  }>(sql`
    SELECT
      c.id, c.customer_name, c.company_name, c.email, c.phone, c.address,
      COALESCE(inv.total_invoiced, 0) AS total_invoiced,
      COALESCE(pay.total_paid, 0) AS total_paid,
      COUNT(*) OVER() AS total_count
    FROM customers c
    LEFT JOIN (
      SELECT customer_id, SUM(current_invoice_total) AS total_invoiced
      FROM invoices
      WHERE status != 'CANCELLED'
      GROUP BY customer_id
    ) inv ON inv.customer_id = c.id
    LEFT JOIN (
      SELECT i.customer_id, SUM(p.amount) AS total_paid
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      WHERE i.status != 'CANCELLED'
      GROUP BY i.customer_id
    ) pay ON pay.customer_id = c.id
    ${
      term
        ? sql`WHERE c.customer_name ILIKE ${"%" + term + "%"}
           OR c.company_name ILIKE ${"%" + term + "%"}
           OR c.email ILIKE ${"%" + term + "%"}
           OR c.phone ILIKE ${"%" + term + "%"}`
        : sql``
    }
    ORDER BY c.customer_name ASC
    ${limitClause}
  `);

  return {
    rows: rows.rows.map((row) => ({
      id: row.id,
      customerName: row.customer_name,
      companyName: row.company_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      totalInvoiced: money(row.total_invoiced),
      totalPaid: money(row.total_paid),
      outstanding: money(row.total_invoiced).minus(money(row.total_paid)),
    })),
    total: rows.rows.length > 0 ? Number(rows.rows[0].total_count) : 0,
  };
}

export async function getCustomerById(id: number) {
  const [row] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return row ?? null;
}

export async function getCustomerWithTotals(id: number) {
  const customer = await getCustomerById(id);
  if (!customer) return null;

  const customerInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.customerId, id))
    .orderBy(desc(invoices.invoiceDate));

  const invoiceIds = customerInvoices.map((inv) => inv.id);

  const paidByInvoice = new Map<number, ReturnType<typeof money>>();
  if (invoiceIds.length > 0) {
    const rows = await db.execute<{ invoice_id: number; total: string }>(sql`
      SELECT invoice_id, SUM(amount) AS total
      FROM payments
      WHERE invoice_id IN ${invoiceIds}
      GROUP BY invoice_id
    `);
    for (const row of rows.rows) {
      paidByInvoice.set(row.invoice_id, money(row.total));
    }
  }

  const invoicesWithTotals = customerInvoices.map((inv) => {
    const paid = paidByInvoice.get(inv.id) ?? money(0);
    const remaining = money(inv.currentInvoiceTotal).minus(paid);
    const status = computeStatus({ currentStatus: inv.status, paid, remaining });
    return { ...inv, status, paid, remaining };
  });

  const nonCancelled = invoicesWithTotals.filter((inv) => inv.status !== "CANCELLED");
  const totalInvoiced = nonCancelled.reduce(
    (acc, inv) => acc.plus(money(inv.currentInvoiceTotal)),
    money(0)
  );
  const totalPaid = nonCancelled.reduce((acc, inv) => acc.plus(inv.paid), money(0));
  const outstanding = totalInvoiced.minus(totalPaid);

  const recentPayments = invoiceIds.length
    ? await db
        .select()
        .from(payments)
        .where(sql`${payments.invoiceId} IN ${invoiceIds}`)
        .orderBy(desc(payments.paymentDate), desc(payments.paymentTime))
        .limit(10)
    : [];

  return {
    customer,
    totals: {
      totalInvoices: nonCancelled.length,
      totalInvoiced,
      totalPaid,
      outstanding,
    },
    invoices: invoicesWithTotals,
    unpaidInvoices: invoicesWithTotals.filter((i) => i.status === "UNPAID"),
    partiallyPaidInvoices: invoicesWithTotals.filter((i) => i.status === "PARTIALLY_PAID"),
    paidInvoices: invoicesWithTotals.filter((i) => i.status === "PAID"),
    recentPayments,
  };
}
