"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { settings, invoiceTexts } from "@/lib/db/schema";
import {
  companySettingsSchema,
  invoiceSettingsSchema,
  invoiceTextSchema,
  type CompanySettingsInput,
  type InvoiceSettingsInput,
  type InvoiceTextInput,
} from "@/lib/validation/settings";
import { logAudit } from "@/lib/audit";

function clean(v: string | undefined) {
  return v && v.trim() ? v.trim() : null;
}

export async function updateCompanySettings(input: CompanySettingsInput) {
  const parsed = companySettingsSchema.parse(input);
  await db
    .update(settings)
    .set({
      companyName: parsed.companyName,
      address: clean(parsed.address),
      phone: clean(parsed.phone),
      email: clean(parsed.email),
      website: clean(parsed.website),
      companyTaxNumber: clean(parsed.companyTaxNumber),
      bankDetails: clean(parsed.bankDetails),
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));
  await logAudit(db, { action: "settings.changed", entity: "settings", details: { section: "company" } });
  revalidatePath("/settings");
}

export async function updateInvoiceSettings(input: InvoiceSettingsInput) {
  const parsed = invoiceSettingsSchema.parse(input);
  await db
    .update(settings)
    .set({
      invoicePrefix: parsed.invoicePrefix,
      nextInvoiceNumber: parsed.nextInvoiceNumber,
      defaultPaymentTerms: clean(parsed.defaultPaymentTerms),
      taxEnabled: parsed.taxEnabled,
      taxName: clean(parsed.taxName),
      taxRate: parsed.taxRate || "0",
      taxAutoApply: parsed.taxAutoApply,
      showPreviousOutstandingOnInvoice: parsed.showPreviousOutstandingOnInvoice,
      footerText: clean(parsed.footerText),
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));
  await logAudit(db, { action: "settings.changed", entity: "settings", details: { section: "invoice" } });
  revalidatePath("/settings");
}

export async function uploadLogo(formData: FormData) {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file selected.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Logo must be an image file.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Logo must be smaller than 5MB.");
  }

  const ext = path.extname(file.name) || ".png";
  // A unique filename per upload — never overwritten — so historical
  // invoices that already snapshotted the old logo path keep showing it.
  const filename = `logo-${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  const publicPath = `/uploads/${filename}`;
  await db.update(settings).set({ logo: publicPath, updatedAt: new Date() }).where(eq(settings.id, 1));
  await logAudit(db, { action: "settings.changed", entity: "settings", details: { section: "logo" } });
  revalidatePath("/settings");
  return publicPath;
}

export async function createInvoiceText(input: InvoiceTextInput) {
  const parsed = invoiceTextSchema.parse(input);
  const [created] = await db.insert(invoiceTexts).values(parsed).returning();
  await logAudit(db, { action: "invoice_text.created", entity: "invoice_text", entityId: created.id });
  revalidatePath("/settings");
  return created;
}

export async function updateInvoiceText(id: number, input: InvoiceTextInput) {
  const parsed = invoiceTextSchema.parse(input);
  const [updated] = await db
    .update(invoiceTexts)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(invoiceTexts.id, id))
    .returning();
  await logAudit(db, { action: "invoice_text.updated", entity: "invoice_text", entityId: id });
  revalidatePath("/settings");
  return updated;
}

export async function deleteInvoiceText(id: number) {
  await db.delete(invoiceTexts).where(eq(invoiceTexts.id, id));
  await logAudit(db, { action: "invoice_text.deleted", entity: "invoice_text", entityId: id });
  revalidatePath("/settings");
}
