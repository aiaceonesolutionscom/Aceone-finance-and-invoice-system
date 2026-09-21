import { sql } from "drizzle-orm";
import type { Tx } from "@/lib/db";

/**
 * Locks the settings row for the duration of the transaction, reads the
 * current prefix/counter, and increments it. Must be called inside the same
 * db.transaction() as the invoice insert so two concurrent invoice creations
 * can never receive the same number — the second call blocks on FOR UPDATE
 * until the first transaction commits.
 */
export async function assignNextInvoiceNumber(tx: Tx): Promise<string> {
  const rows = await tx.execute<{
    invoice_prefix: string;
    next_invoice_number: number;
  }>(sql`
    SELECT invoice_prefix, next_invoice_number
    FROM settings
    WHERE id = 1
    FOR UPDATE
  `);

  const row = rows.rows[0];
  if (!row) {
    throw new Error(
      "Settings row is missing — run `npm run seed-settings` first."
    );
  }

  const invoiceNumber = `${row.invoice_prefix}${row.next_invoice_number}`;

  await tx.execute(sql`
    UPDATE settings
    SET next_invoice_number = next_invoice_number + 1
    WHERE id = 1
  `);

  return invoiceNumber;
}
