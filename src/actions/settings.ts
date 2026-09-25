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
import { requireAuth } from "@/lib/auth";

const ALLOWED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const ALLOWED_IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function clean(v: string | undefined) {
  return v && v.trim() ? v.trim() : null;
}

export async function updateCompanySettings(input: CompanySettingsInput) {
  await requireAuth();
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
  revalidatePath("/invoices");
}

export async function updateInvoiceSettings(input: InvoiceSettingsInput) {
  await requireAuth();
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
  revalidatePath("/invoices");
}

export async function uploadLogo(formData: FormData) {
  await requireAuth();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file selected.");
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_IMAGE_EXT.has(ext)) {
    throw new Error("Invalid image format. Only PNG, JPG, and WEBP are allowed.");
  }
  if (!ALLOWED_IMAGE_MIME.has(file.type.toLowerCase())) {
    throw new Error("Invalid file type. Only PNG, JPG, and WEBP images are allowed.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Logo must be smaller than 5MB.");
  }

  // A unique, randomized filename per upload — never overwritten — so historical
  // invoices that already snapshotted the old logo path keep showing it.
  const filename = `logo-${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
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
  await requireAuth();
  const parsed = invoiceTextSchema.parse(input);
  const [created] = await db.insert(invoiceTexts).values(parsed).returning();
  await logAudit(db, { action: "invoice_text.created", entity: "invoice_text", entityId: created.id });
  revalidatePath("/settings");
  revalidatePath("/invoices");
  return created;
}

export async function updateInvoiceText(id: number, input: InvoiceTextInput) {
  await requireAuth();
  const parsed = invoiceTextSchema.parse(input);
  const [updated] = await db
    .update(invoiceTexts)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(invoiceTexts.id, id))
    .returning();
  await logAudit(db, { action: "invoice_text.updated", entity: "invoice_text", entityId: id });
  revalidatePath("/settings");
  revalidatePath("/invoices");
  return updated;
}

export async function deleteInvoiceText(id: number) {
  await requireAuth();
  await db.delete(invoiceTexts).where(eq(invoiceTexts.id, id));
  await logAudit(db, { action: "invoice_text.deleted", entity: "invoice_text", entityId: id });
  revalidatePath("/settings");
  revalidatePath("/invoices");
}

