import { z } from "zod";
import { moneyStringSchema, positiveMoneyStringSchema } from "./money";

export const invoiceLineSchema = z
  .object({
    serviceId: z.number().int().positive().nullable(),
    customName: z.string().trim().nullable(),
    rate: positiveMoneyStringSchema,
  })
  .refine((line) => line.serviceId !== null || !!line.customName, {
    message: "Pick a service or type a custom name",
    path: ["customName"],
  });

export const invoiceSchema = z.object({
  customerId: z.number().int().positive("Select a customer"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  discount: moneyStringSchema,
  lines: z.array(invoiceLineSchema).min(1, "Add at least one line item"),
  // Previous Outstanding is always computed and stored on the invoice, but
  // whether it's folded into "Total Amount Due" (the payable figure shown to
  // the customer) is the operator's call per invoice.
  includePreviousOutstanding: z.boolean(),
});

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
