"use server";

import { randomUUID } from "crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { invoices, payments } from "@/lib/db/schema";
import { paymentSchema, bulkPaymentSchema, type PaymentInput, type BulkPaymentInput } from "@/lib/validation/payment";
import { recalcInvoiceStatus } from "@/lib/invoice-status";
import { money, toDbString } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export async function createPayment(input: PaymentInput) {
  const user = await requireAuth();
  const parsed = paymentSchema.parse(input);

  const result = await db.transaction(async (tx) => {


    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, parsed.invoiceId))
      .limit(1);
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "CANCELLED") {
      throw new Error("Cannot record a payment on a cancelled invoice.");
    }

    const [{ total: paidTotal }] = await tx
      .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(eq(payments.invoiceId, parsed.invoiceId));

    const remaining = money(invoice.currentInvoiceTotal).minus(money(paidTotal));
    const amount = money(parsed.amount);

    if (amount.lte(0)) {
      throw new Error("Payment amount must be greater than zero.");
    }
    if (amount.gt(remaining)) {
      throw new Error(
        `Payment amount exceeds remaining balance of ${remaining.toFixed(2)}.`
      );
    }

    const [created] = await tx
      .insert(payments)
      .values({
        invoiceId: parsed.invoiceId,
        customerId: invoice.customerId,
        amount: toDbString(amount),
        paymentDate: parsed.paymentDate,
        paymentTime: parsed.paymentTime || null,
        paymentMethod: parsed.paymentMethod,
        reference: parsed.reference || null,
        notes: parsed.notes || null,
        createdBy: user?.email ?? null,
      })
      .returning();

    const status = await recalcInvoiceStatus(tx, parsed.invoiceId);
    await logAudit(tx, {
      action: "payment.added",
      entity: "payment",
      entityId: created.id,
      details: { invoiceId: parsed.invoiceId, amount: toDbString(amount) },
    });
    return { status, remaining: remaining.minus(amount).toFixed(2) };
  });

  revalidatePath(`/invoices/${parsed.invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
  return result;
}

/**
 * Records one payment against each invoice with a non-zero amount entry —
 * used when a customer's single payment covers both the current invoice and
 * an older, still-outstanding one. Each invoice gets its own payments row
 * (never merged), so history for the old invoice stays accurate.
 */
export async function createBulkPayment(input: BulkPaymentInput) {
  const user = await requireAuth();
  const parsed = bulkPaymentSchema.parse(input);

  const nonZeroEntries = parsed.entries.filter((e) => money(e.amount).gt(0));
  // Only tag payments with a shared batch when the payment actually spans
  // more than one invoice — a normal single-invoice payment needs no link.
  const batchId = nonZeroEntries.length > 1 ? randomUUID() : null;



  const results = await db.transaction(async (tx) => {
    const entryResults: { invoiceId: number; status: string; remaining: string }[] = [];

    for (const entry of nonZeroEntries) {
      const amount = money(entry.amount);

      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, entry.invoiceId)).limit(1);
      if (!invoice) throw new Error(`Invoice ${entry.invoiceId} not found`);
      if (invoice.status === "CANCELLED") {
        throw new Error(`Cannot record a payment on cancelled invoice ${invoice.invoiceNumber}.`);
      }

      const [{ total: paidTotal }] = await tx
        .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .where(eq(payments.invoiceId, entry.invoiceId));

      const remaining = money(invoice.currentInvoiceTotal).minus(money(paidTotal));
      if (amount.gt(remaining)) {
        throw new Error(
          `Payment for ${invoice.invoiceNumber} (${amount.toFixed(2)}) exceeds its remaining balance of ${remaining.toFixed(2)}.`
        );
      }

      const [created] = await tx
        .insert(payments)
        .values({
          invoiceId: entry.invoiceId,
          customerId: invoice.customerId,
          amount: toDbString(amount),
          paymentDate: parsed.paymentDate,
          paymentTime: parsed.paymentTime || null,
          paymentMethod: parsed.paymentMethod,
          reference: parsed.reference || null,
          notes: parsed.notes || null,
          createdBy: user?.email ?? null,
          batchId,
        })
        .returning();

      const status = await recalcInvoiceStatus(tx, entry.invoiceId);
      await logAudit(tx, {
        action: "payment.added",
        entity: "payment",
        entityId: created.id,
        details: { invoiceId: entry.invoiceId, amount: toDbString(amount) },
      });

      entryResults.push({ invoiceId: entry.invoiceId, status, remaining: remaining.minus(amount).toFixed(2) });
    }

    if (entryResults.length === 0) {
      throw new Error("Enter at least one payment amount greater than zero.");
    }

    return entryResults;
  });

  revalidatePath("/invoices");
  revalidatePath("/payments");
  for (const r of results) {
    revalidatePath(`/invoices/${r.invoiceId}`);
  }
  return results;
}

export async function deletePayment(paymentId: number) {
  await requireAuth();
  const invoiceId = await db.transaction(async (tx) => {

    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);
    if (!payment) throw new Error("Payment not found");

    await tx.delete(payments).where(eq(payments.id, paymentId));
    await recalcInvoiceStatus(tx, payment.invoiceId);
    await logAudit(tx, {
      action: "payment.deleted",
      entity: "payment",
      entityId: paymentId,
      details: { invoiceId: payment.invoiceId, amount: payment.amount },
    });
    return payment.invoiceId;
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
}
