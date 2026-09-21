import { desc, eq } from "drizzle-orm";
import { db, type Tx } from "@/lib/db";
import { invoiceTexts, settings } from "@/lib/db/schema";

export async function getSettings(executor: Tx | typeof db = db) {
  const [row] = await executor.select().from(settings).where(eq(settings.id, 1)).limit(1);

  if (!row) {
    throw new Error(
      "Settings row is missing — run `npm run seed-settings` first."
    );
  }

  return row;
}

export async function listInvoiceTexts(executor: Tx | typeof db = db) {
  return executor.select().from(invoiceTexts).orderBy(invoiceTexts.sortOrder, desc(invoiceTexts.createdAt));
}

export async function listEnabledInvoiceTexts(executor: Tx | typeof db = db) {
  const all = await listInvoiceTexts(executor);
  return all.filter((t) => t.enabled).map((t) => ({ title: t.title, content: t.content }));
}
