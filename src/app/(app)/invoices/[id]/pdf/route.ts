import { NextResponse } from "next/server";
import path from "path";
import { pathToFileURL } from "url";
import { existsSync } from "fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { money } from "@/lib/money";
import { getInvoiceById } from "@/lib/db/queries/invoices";
import { getSettings, listEnabledInvoiceTexts } from "@/lib/db/queries/settings";
import { InvoiceDocument } from "@/components/pdf/invoice-document";
import { logError } from "@/lib/log";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const data = await getInvoiceById(Number(id));
  if (!data) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const [settingsRow, activeInvoiceTexts] = await Promise.all([
    getSettings().catch(() => null),
    listEnabledInvoiceTexts().catch(() => null),
  ]);

  const invoiceData = {
    ...data.invoice,
    paymentTermsSnapshot:
      settingsRow?.defaultPaymentTerms ||
      data.invoice.paymentTermsSnapshot ||
      "On Receipt",
    footerSnapshot:
      settingsRow?.footerText ||
      data.invoice.footerSnapshot ||
      null,
    additionalTextSnapshot:
      activeInvoiceTexts !== null
        ? activeInvoiceTexts
        : (data.invoice.additionalTextSnapshot ?? []),
    companySnapshot: {
      ...data.invoice.companySnapshot,
      ...settingsRow,
      companyName: settingsRow?.companyName || data.invoice.companySnapshot?.companyName || "AceOne Creative Agency",
      phone: settingsRow?.phone || data.invoice.companySnapshot?.phone || null,
      email: settingsRow?.email || data.invoice.companySnapshot?.email || null,
      website: settingsRow?.website || data.invoice.companySnapshot?.website || null,
      address: settingsRow?.address || data.invoice.companySnapshot?.address || null,
      companyTaxNumber: settingsRow?.companyTaxNumber || data.invoice.companySnapshot?.companyTaxNumber || null,
      bankDetails: settingsRow?.bankDetails || data.invoice.companySnapshot?.bankDetails || null,
    },
  };

  const siblingInvoiceNumbers = new Set(
    data.payments.flatMap((p) => p.siblingInvoices?.map((s) => s.invoiceNumber) || [])
  );

  const previousOutstandingInvoices = data.previousInvoices
    .filter(
      (inv) =>
        money(inv.remaining).gt(0) ||
        siblingInvoiceNumbers.has(inv.invoiceNumber) ||
        inv.isContributedToThisInvoice
    )
    .map((inv) => ({
      ...inv,
      isPaidWithThisInvoice:
        siblingInvoiceNumbers.has(inv.invoiceNumber) ||
        Boolean(inv.isContributedToThisInvoice && money(inv.remaining).lte(0)),
    }));

  const redLogo = path.join(process.cwd(), "public", "aceone-logo.png");
  const whiteLogo = path.join(process.cwd(), "public", "logo-white.png");

  const logoAbsolutePath = existsSync(redLogo) ? pathToFileURL(redLogo).href : null;
  const whiteLogoAbsolutePath = existsSync(whiteLogo) ? pathToFileURL(whiteLogo).href : null;

  try {
    const buffer = await renderToBuffer(
      InvoiceDocument({
        invoice: invoiceData,
        items: data.items,
        invoicePayments: data.payments,
        previousOutstandingInvoices,
        logoAbsolutePath,
        whiteLogoAbsolutePath,
        rolledIntoInvoice: data.rolledIntoInvoice,
      })
    );

    // Universal Date-Stamped Invoice PDF Filename (e.g. INV-2026-09-23-52.pdf)
    // Allows chronological sorting and instant date identification
    const prefixMatch = data.invoice.invoiceNumber.match(/^([A-Za-z]+)-?(.*)$/);
    const prefix = prefixMatch ? prefixMatch[1].toUpperCase() : "INV";
    const numPart = prefixMatch && prefixMatch[2] ? prefixMatch[2] : data.invoice.invoiceNumber;
    const datePart = data.invoice.invoiceDate || new Date().toISOString().slice(0, 10);
    const pdfFilename = `${prefix}-${datePart}-${numPart}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdfFilename}"`,
      },
    });
  } catch (error) {
    await logError(error, { path: `/invoices/${id}/pdf`, invoiceNumber: data.invoice.invoiceNumber });
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
