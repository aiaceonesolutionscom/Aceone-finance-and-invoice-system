import { z } from "zod";

export const customerSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required"),
  companyName: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;
