import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Service name is required"),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
