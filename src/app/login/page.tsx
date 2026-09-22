import Image from "next/image";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-white p-6">
      <Card className="relative w-full max-w-sm border-t-4" style={{ borderTopColor: "#BE1960" }}>
        <CardHeader className="flex flex-col items-center text-center">
          <Image src="/aceone-logo.png" alt="AceOne Creative Agency" width={218} height={80} className="h-auto w-48" />
          <p className="text-sm text-muted-foreground">Sign in to the finance system</p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
