import { eq, sql } from "drizzle-orm";
import type { Tx } from "@/lib/db";
import { invoices, payments } from "@/lib/db/schema";
import { money, type MoneyInput } from "@/lib/money";

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

/**
 * Pure status computation, usable both to persist a status (recalcInvoiceStatus)
 * and to derive the display status at read time. This business does not use
 * due dates, so OVERDUE is never computed here — it stays a reachable enum
 * value in the schema only for forward compatibility, never assigned.
 */
export function computeStatus(input: {
  currentStatus: InvoiceStatus;
  paid: MoneyInput;
  remaining: MoneyInput;
}): InvoiceStatus {
  if (input.currentStatus === "CANCELLED") return "CANCELLED";

  const remaining = money(input.remaining);
  const paid = money(input.paid);

  if (remaining.lte(0)) return "PAID";
  if (paid.gt(0)) return "PARTIALLY_PAID";
  return "UNPAID";
}

/**
 * The single place invoices.status is ever written. Call this after an
 * invoice is created/updated and after every payment add/delete so status
 * can never drift from the underlying totals.
 */
export async function recalcInvoiceStatus(
  tx: Tx,
  invoiceId: number
): Promise<InvoiceStatus> {
  const [invoice] = await tx
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  const [{ total: paidTotal }] = await tx
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));

  const paid = money(paidTotal);
  const remaining = money(invoice.currentInvoiceTotal).minus(paid);
  const status = computeStatus({ currentStatus: invoice.status, paid, remaining });

  if (status !== invoice.status) {
    await tx.update(invoices).set({ status, updatedAt: new Date() }).where(eq(invoices.id, invoiceId));
  }

  return status;
}
