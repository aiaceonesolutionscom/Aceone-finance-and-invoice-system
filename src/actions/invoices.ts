"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, type Tx } from "@/lib/db";
import { customers, invoiceItems, invoices, payments, services } from "@/lib/db/schema";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation/invoice";
import { assignNextInvoiceNumber } from "@/lib/invoice-number";
import { upsertServiceByName } from "@/lib/db/queries/services";
import { getPreviousOutstanding } from "@/lib/db/queries/invoices";
import { getSettings, listEnabledInvoiceTexts } from "@/lib/db/queries/settings";
import { recalcInvoiceStatus } from "@/lib/invoice-status";
import { money, sumMoney, toDbString } from "@/lib/money";
import { logAudit } from "@/lib/audit";

async function resolveLines(tx: Tx, lines: InvoiceInput["lines"]) {
  const resolved: { serviceId: number; serviceName: string; rate: string }[] = [];

  for (const line of lines) {
    if (line.serviceId) {
      const [svc] = await tx
        .select()
        .from(services)
        .where(eq(services.id, line.serviceId))
        .limit(1);
      if (!svc) throw new Error("Selected service no longer exists");
      resolved.push({ serviceId: svc.id, serviceName: svc.name, rate: line.rate });
    } else {
      const svc = await upsertServiceByName(tx, line.customName!);
      resolved.push({ serviceId: svc.id, serviceName: svc.name, rate: line.rate });
    }
  }

  return resolved;
}

function buildSnapshots(
  settingsRow: Awaited<ReturnType<typeof getSettings>>,
  customer: typeof customers.$inferSelect
) {
  return {
    companySnapshot: {
      companyName: settingsRow.companyName,
      address: settingsRow.address,
      phone: settingsRow.phone,
      email: settingsRow.email,
      website: settingsRow.website,
      companyTaxNumber: settingsRow.companyTaxNumber,
      bankDetails: settingsRow.bankDetails,
      logo: settingsRow.logo,
    },
    customerSnapshot: {
      customerName: customer.customerName,
      companyName: customer.companyName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    },
  };
}

export async function createInvoice(
  input: InvoiceInput,
  options?: { openPaymentAfter?: boolean }
) {
  const parsed = invoiceSchema.parse(input);

  const invoiceId = await db.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, parsed.customerId))
      .limit(1);
    if (!customer) throw new Error("Customer not found");

    // Locks the settings row for the rest of this transaction.
    const invoiceNumber = await assignNextInvoiceNumber(tx);
    const settingsRow = await getSettings(tx);
    const enabledTexts = await listEnabledInvoiceTexts(tx);

    const resolvedLines = await resolveLines(tx, parsed.lines);

    const subtotal = sumMoney(resolvedLines.map((l) => l.rate));
    const discount = money(parsed.discount);
    const taxApplies = settingsRow.taxEnabled && settingsRow.taxAutoApply;
    const taxRate = money(settingsRow.taxRate);
    const taxAmount = taxApplies
      ? subtotal.minus(discount).times(taxRate).dividedBy(100)
      : money(0);
    const currentInvoiceTotal = subtotal.minus(discount).plus(taxAmount);

    const { previousOutstandingAmount } = await getPreviousOutstanding(
      tx,
      parsed.customerId
    );
    const totalAmountDue = parsed.includePreviousOutstanding
      ? currentInvoiceTotal.plus(previousOutstandingAmount)
      : currentInvoiceTotal;

    const { companySnapshot, customerSnapshot } = buildSnapshots(settingsRow, customer);

    const [invoice] = await tx
      .insert(invoices)
      .values({
        invoiceNumber,
        customerId: parsed.customerId,
        invoiceDate: parsed.invoiceDate,
        subtotal: toDbString(subtotal),
        discount: toDbString(discount),
        taxNameSnapshot: taxApplies ? settingsRow.taxName : null,
        taxRateSnapshot: taxApplies ? settingsRow.taxRate : null,
        taxAmount: toDbString(taxAmount),
        currentInvoiceTotal: toDbString(currentInvoiceTotal),
        previousOutstandingAmount: toDbString(previousOutstandingAmount),
        totalAmountDue: toDbString(totalAmountDue),
        companySnapshot,
        customerSnapshot,
        paymentTermsSnapshot: settingsRow.defaultPaymentTerms,
        footerSnapshot: settingsRow.footerText,
        additionalTextSnapshot: enabledTexts,
      })
      .returning();

    await tx.insert(invoiceItems).values(
      resolvedLines.map((line) => ({
        invoiceId: invoice.id,
        serviceId: line.serviceId,
        serviceNameSnapshot: line.serviceName,
        rate: toDbString(money(line.rate)),
        total: toDbString(money(line.rate)),
      }))
    );

    await recalcInvoiceStatus(tx, invoice.id);
    await logAudit(tx, {
      action: "invoice.created",
      entity: "invoice",
      entityId: invoice.id,
      details: { invoiceNumber: invoice.invoiceNumber, total: currentInvoiceTotal.toFixed(2) },
    });

    return invoice.id;
  });

  revalidatePath("/invoices");
  revalidatePath(`/customers/${parsed.customerId}`);
  redirect(options?.openPaymentAfter ? `/invoices/${invoiceId}?openPayment=1` : `/invoices/${invoiceId}`);
}

export async function updateInvoice(id: number, input: InvoiceInput) {
  const parsed = invoiceSchema.parse(input);

  // Editing an invoice that already has payments is allowed (e.g. to correct
  // a mistake) — recalcInvoiceStatus below re-derives status against
  // whatever the new total is, using the same payments already on record.

  await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!existing) throw new Error("Invoice not found");

    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, parsed.customerId))
      .limit(1);
    if (!customer) throw new Error("Customer not found");

    const settingsRow = await getSettings(tx);
    const enabledTexts = await listEnabledInvoiceTexts(tx);
    const resolvedLines = await resolveLines(tx, parsed.lines);

    const subtotal = sumMoney(resolvedLines.map((l) => l.rate));
    const discount = money(parsed.discount);
    const taxApplies = settingsRow.taxEnabled && settingsRow.taxAutoApply;
    const taxRate = money(settingsRow.taxRate);
    const taxAmount = taxApplies
      ? subtotal.minus(discount).times(taxRate).dividedBy(100)
      : money(0);
    const currentInvoiceTotal = subtotal.minus(discount).plus(taxAmount);

    const { previousOutstandingAmount } = await getPreviousOutstanding(
      tx,
      parsed.customerId,
      id
    );
    const totalAmountDue = parsed.includePreviousOutstanding
      ? currentInvoiceTotal.plus(previousOutstandingAmount)
      : currentInvoiceTotal;

    const { companySnapshot, customerSnapshot } = buildSnapshots(settingsRow, customer);

    await tx
      .update(invoices)
      .set({
        customerId: parsed.customerId,
        invoiceDate: parsed.invoiceDate,
        subtotal: toDbString(subtotal),
        discount: toDbString(discount),
        taxNameSnapshot: taxApplies ? settingsRow.taxName : null,
        taxRateSnapshot: taxApplies ? settingsRow.taxRate : null,
        taxAmount: toDbString(taxAmount),
        currentInvoiceTotal: toDbString(currentInvoiceTotal),
        previousOutstandingAmount: toDbString(previousOutstandingAmount),
        totalAmountDue: toDbString(totalAmountDue),
        companySnapshot,
        customerSnapshot,
        paymentTermsSnapshot: settingsRow.defaultPaymentTerms,
        footerSnapshot: settingsRow.footerText,
        additionalTextSnapshot: enabledTexts,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));

    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await tx.insert(invoiceItems).values(
      resolvedLines.map((line) => ({
        invoiceId: id,
        serviceId: line.serviceId,
        serviceNameSnapshot: line.serviceName,
        rate: toDbString(money(line.rate)),
        total: toDbString(money(line.rate)),
      }))
    );

    await recalcInvoiceStatus(tx, id);
    await logAudit(tx, { action: "invoice.edited", entity: "invoice", entityId: id });
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function cancelInvoice(id: number) {
  await db.update(invoices).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(invoices.id, id));
  await logAudit(db, { action: "invoice.cancelled", entity: "invoice", entityId: id });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function deleteInvoice(id: number) {
  const customerId = await db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!invoice) throw new Error("Invoice not found");

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(eq(payments.invoiceId, id));
    if (count > 0) {
      throw new Error("Cannot delete an invoice that already has payments recorded — cancel it instead.");
    }

    // invoice_items cascade-deletes with the invoice (FK onDelete: "cascade").
    await tx.delete(invoices).where(eq(invoices.id, id));
    await logAudit(tx, {
      action: "invoice.deleted",
      entity: "invoice",
      entityId: id,
      details: { invoiceNumber: invoice.invoiceNumber },
    });

    return invoice.customerId;
  });

  revalidatePath("/invoices");
  revalidatePath(`/customers/${customerId}`);
}

export async function previewPreviousOutstanding(customerId: number, excludeInvoiceId?: number) {
  const result = await getPreviousOutstanding(db, customerId, excludeInvoiceId);
  return {
    previousOutstandingAmount: result.previousOutstandingAmount.toFixed(2),
    invoices: result.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      total: inv.total.toFixed(2),
      paid: inv.paid.toFixed(2),
      remaining: inv.remaining.toFixed(2),
    })),
  };
}
