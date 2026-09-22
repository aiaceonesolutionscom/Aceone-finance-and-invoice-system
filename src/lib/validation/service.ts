import { z } from "zod";

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Service name must be at least 2 characters")
    .regex(/[a-zA-Z\u0600-\u06FF]/, "Service name must contain letters, not just numbers"),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
