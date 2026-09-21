import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { getSessionUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-full min-h-screen w-full flex-col md:flex-row">
      <Sidebar userEmail={user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
