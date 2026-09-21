import { PageHeader } from "@/components/layout/header";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default function AccountPage() {
  return (
    <div>
      <PageHeader title="Account" description="Update the password for this account." />
      <ChangePasswordForm />
    </div>
  );
}
