import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/header";
import { BackButton } from "@/components/layout/back-button";
import { CustomerForm } from "@/components/customers/customer-form";
import { getCustomerById } from "@/lib/db/queries/customers";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerById(Number(id));
  if (!customer) notFound();

  return (
    <div>
      <BackButton fallbackHref={`/customers/${customer.id}`} />
      <PageHeader title={`Edit ${customer.customerName}`} />
      <CustomerForm
        customerId={customer.id}
        defaultValues={{
          customerName: customer.customerName,
          companyName: customer.companyName ?? "",
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          address: customer.address ?? "",
        }}
      />
    </div>
  );
}
