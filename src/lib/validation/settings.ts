import { z } from "zod";

export const companySettingsSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  address: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal("")),
  companyTaxNumber: z.string().trim().optional().or(z.literal("")),
  bankDetails: z.string().trim().optional().or(z.literal("")),
});
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

export const invoiceSettingsSchema = z.object({
  invoicePrefix: z.string().trim().min(1, "Invoice prefix is required"),
  nextInvoiceNumber: z.number().int().positive("Must be a positive number"),
  defaultPaymentTerms: z.string().trim().optional().or(z.literal("")),
  taxEnabled: z.boolean(),
  taxName: z.string().trim().optional().or(z.literal("")),
  taxRate: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid percentage")
    .optional()
    .or(z.literal("")),
  taxAutoApply: z.boolean(),
  showPreviousOutstandingOnInvoice: z.boolean(),
  footerText: z.string().trim().optional().or(z.literal("")),
});
export type InvoiceSettingsInput = z.infer<typeof invoiceSettingsSchema>;

export const invoiceTextSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Content is required"),
  enabled: z.boolean(),
  sortOrder: z.coerce.number().int(),
});
export type InvoiceTextInput = z.infer<typeof invoiceTextSchema>;
