import { NextResponse } from "next/server";
import path from "path";
import { pathToFileURL } from "url";
import { existsSync } from "fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionUser } from "@/lib/auth";
import { getInvoiceById } from "@/lib/db/queries/invoices";
import { InvoiceDocument } from "@/components/pdf/invoice-document";

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

  const logo = data.invoice.companySnapshot.logo;
  let logoAbsolutePath: string | null = null;
  if (logo) {
    const candidate = path.join(process.cwd(), "public", logo);
    if (existsSync(candidate)) {
      // @react-pdf/image misparses a bare Windows path (e.g. "D:\...") as a
      // URL with scheme "D:" and tries to fetch() it as remote — converting
      // to a proper file:// URL avoids that path entirely.
      logoAbsolutePath = pathToFileURL(candidate).href;
    }
  }

  try {
    const buffer = await renderToBuffer(
      InvoiceDocument({
        invoice: data.invoice,
        items: data.items,
        invoicePayments: data.payments,
        logoAbsolutePath,
      })
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${data.invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
