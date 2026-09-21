import { z } from "zod";
import { moneyStringSchema, positiveMoneyStringSchema } from "./money";

export const paymentMethods = [
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "JAZZCASH",
  "EASYPAISA",
  "OTHER",
] as const;

export const paymentSchema = z.object({
  invoiceId: z.number().int().positive(),
  amount: positiveMoneyStringSchema,
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentTime: z.string().trim().optional().or(z.literal("")),
  paymentMethod: z.enum(paymentMethods),
  reference: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// A single "record payment" action that can apply money to several invoices
// at once (the current invoice plus any previous-outstanding ones) — each
// gets its own payments row, recorded against the correct invoice.
export const bulkPaymentEntrySchema = z.object({
  invoiceId: z.number().int().positive(),
  amount: moneyStringSchema, // non-negative — zero entries are simply skipped
});

export const bulkPaymentSchema = z
  .object({
    entries: z.array(bulkPaymentEntrySchema).min(1),
    paymentDate: z.string().min(1, "Payment date is required"),
    paymentTime: z.string().trim().optional().or(z.literal("")),
    paymentMethod: z.enum(paymentMethods),
    reference: z.string().trim().optional().or(z.literal("")),
    notes: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => data.entries.some((e) => Number(e.amount) > 0), {
    message: "Enter at least one payment amount",
    path: ["entries"],
  });

export type BulkPaymentInput = z.infer<typeof bulkPaymentSchema>;
