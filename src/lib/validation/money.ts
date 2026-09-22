import { z } from "zod";

/** A monetary value coming from a form field: strips commas and validates non-negative decimal. */
export const moneyStringSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/,/g, ""))
  .pipe(
    z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 1000 or 1000.50)")
  );

/** Same as moneyStringSchema but must be strictly greater than zero. */
export const positiveMoneyStringSchema = moneyStringSchema.refine(
  (v) => Number(v) > 0,
  "Amount must be greater than zero"
);
