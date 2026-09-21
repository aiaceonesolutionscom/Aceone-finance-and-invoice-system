import { PageHeader } from "@/components/layout/header";
import { BackButton } from "@/components/layout/back-button";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { listServices } from "@/lib/db/queries/services";
import { getSettings } from "@/lib/db/queries/settings";

export default async function NewInvoicePage() {
  const [customerRows, services, settings] = await Promise.all([
    db.select().from(customers).orderBy(customers.customerName),
    listServices(),
    getSettings(),
  ]);

  return (
    <div>
      <BackButton fallbackHref="/invoices" />
      <PageHeader title="Create Invoice" />
      <InvoiceForm
        customers={customerRows}
        services={services}
        taxInfo={{
          enabled: settings.taxEnabled,
          autoApply: settings.taxAutoApply,
          name: settings.taxName,
          rate: settings.taxRate,
        }}
      />
    </div>
  );
}
