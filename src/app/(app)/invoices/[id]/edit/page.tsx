import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { BackButton } from "@/components/layout/back-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { getInvoiceById, invoiceHasPayments } from "@/lib/db/queries/invoices";
import { listServices } from "@/lib/db/queries/services";
import { getSettings } from "@/lib/db/queries/settings";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoiceId = Number(id);
  const data = await getInvoiceById(invoiceId);
  if (!data) notFound();

  if (data.invoice.status === "CANCELLED") {
    return (
      <div>
        <BackButton fallbackHref={`/invoices/${invoiceId}`} />
        <PageHeader title={`Edit ${data.invoice.invoiceNumber}`} />
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          This invoice is cancelled and can no longer be edited.
        </div>
      </div>
    );
  }

  const hasPayments = await invoiceHasPayments(invoiceId);

  const [customerRows, services, settings] = await Promise.all([
    db.select().from(customers).orderBy(customers.customerName),
    listServices(),
    getSettings(),
  ]);

  return (
    <div>
      <BackButton fallbackHref={`/invoices/${invoiceId}`} />
      <PageHeader title={`Edit ${data.invoice.invoiceNumber}`} />

      {hasPayments ? (
        <Alert className="mb-6 border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="size-4" />
          <AlertTitle>This invoice already has recorded payments</AlertTitle>
          <AlertDescription>
            Editing will recompute the invoice total and status against the payments already on
            file. If the new total is less than what&apos;s already been paid, the invoice will
            simply show as PAID with nothing further owed — no refund is tracked automatically.
          </AlertDescription>
        </Alert>
      ) : null}

      <InvoiceForm
        mode="edit"
        invoiceId={invoiceId}
        customers={customerRows}
        services={services}
        taxInfo={{
          enabled: settings.taxEnabled,
          autoApply: settings.taxAutoApply,
          name: settings.taxName,
          rate: settings.taxRate,
        }}
        defaultValues={{
          customerId: data.invoice.customerId,
          invoiceDate: data.invoice.invoiceDate,
          discount: data.invoice.discount,
          lines: data.items.map((item) => ({
            serviceId: item.serviceId,
            customName: item.serviceId ? null : item.serviceNameSnapshot,
            rate: item.rate,
          })),
          includePreviousOutstanding: Number(data.invoice.totalAmountDue) > Number(data.invoice.currentInvoiceTotal),
        }}
      />
    </div>
  );
}
