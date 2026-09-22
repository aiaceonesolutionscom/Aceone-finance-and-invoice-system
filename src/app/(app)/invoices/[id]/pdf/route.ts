import { NextResponse } from "next/server";
import path from "path";
import { pathToFileURL } from "url";
import { existsSync } from "fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInvoiceById, getPreviousOutstanding } from "@/lib/db/queries/invoices";
import { getSettings } from "@/lib/db/queries/settings";
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

  const [settingsRow, previousOutstanding] = await Promise.all([
    getSettings().catch(() => null),
    getPreviousOutstanding(db, data.invoice.customerId, data.invoice.id).catch(() => ({
      invoices: [],
      previousOutstandingAmount: null,
    })),
  ]);

  const invoiceData = {
    ...data.invoice,
    companySnapshot: {
      ...settingsRow,
      ...data.invoice.companySnapshot,
      companyName: data.invoice.companySnapshot?.companyName || settingsRow?.companyName || "AceOne Creative Agency",
      phone: data.invoice.companySnapshot?.phone || settingsRow?.phone || null,
      email: data.invoice.companySnapshot?.email || settingsRow?.email || null,
      website: data.invoice.companySnapshot?.website || settingsRow?.website || null,
      address: data.invoice.companySnapshot?.address || settingsRow?.address || null,
      companyTaxNumber: data.invoice.companySnapshot?.companyTaxNumber || settingsRow?.companyTaxNumber || null,
      bankDetails: data.invoice.companySnapshot?.bankDetails || settingsRow?.bankDetails || null,
    },
  };

  const previousOutstandingInvoices = (previousOutstanding?.invoices ?? []).map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    remaining: inv.remaining.toString(),
    total: inv.total.toString(),
    paid: inv.paid.toString(),
  }));

  const redLogo = path.join(process.cwd(), "public", "logo-color.png");
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
      })
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${data.invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    await logError(error, { path: `/invoices/${id}/pdf`, invoiceNumber: data.invoice.invoiceNumber });
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
