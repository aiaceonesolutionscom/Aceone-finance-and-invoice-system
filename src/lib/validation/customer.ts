import { z } from "zod";

export const customerSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters")
    .regex(/[a-zA-Z\u0600-\u06FF]/, "Customer name must contain letters, not just numbers"),
  companyName: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9\s\-().]{7,25})?$/, "Enter a valid phone number (e.g. +92 321 9338893)")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;
