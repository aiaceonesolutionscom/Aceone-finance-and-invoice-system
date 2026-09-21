import { PageHeader } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { LogoUpload } from "@/components/settings/logo-upload";
import { InvoiceSettingsForm } from "@/components/settings/invoice-settings-form";
import { InvoiceTextsManager } from "@/components/settings/invoice-texts-manager";
import { getSettings, listInvoiceTexts } from "@/lib/db/queries/settings";

export default async function SettingsPage() {
  const [settings, texts] = await Promise.all([getSettings(), listInvoiceTexts()]);

  return (
    <div>
      <PageHeader title="Settings" description="Company information, invoice configuration, and invoice texts." />

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
          <TabsTrigger value="texts">Additional Invoice Texts</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6 space-y-6">
          <LogoUpload currentLogo={settings.logo} />
          <CompanySettingsForm
            defaultValues={{
              companyName: settings.companyName ?? "",
              address: settings.address ?? "",
              phone: settings.phone ?? "",
              email: settings.email ?? "",
              website: settings.website ?? "",
              companyTaxNumber: settings.companyTaxNumber ?? "",
              bankDetails: settings.bankDetails ?? "",
            }}
          />
        </TabsContent>

        <TabsContent value="invoice" className="mt-6">
          <InvoiceSettingsForm
            defaultValues={{
              invoicePrefix: settings.invoicePrefix,
              nextInvoiceNumber: settings.nextInvoiceNumber,
              defaultPaymentTerms: settings.defaultPaymentTerms ?? "",
              taxEnabled: settings.taxEnabled,
              taxName: settings.taxName ?? "",
              taxRate: settings.taxRate ?? "0",
              taxAutoApply: settings.taxAutoApply,
              showPreviousOutstandingOnInvoice: settings.showPreviousOutstandingOnInvoice,
              footerText: settings.footerText ?? "",
            }}
          />
        </TabsContent>

        <TabsContent value="texts" className="mt-6">
          <InvoiceTextsManager texts={texts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
