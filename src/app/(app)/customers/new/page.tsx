import { PageHeader } from "@/components/layout/header";
import { BackButton } from "@/components/layout/back-button";
import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div>
      <BackButton fallbackHref="/customers" />
      <PageHeader title="Add Customer" />
      <CustomerForm />
    </div>
  );
}
