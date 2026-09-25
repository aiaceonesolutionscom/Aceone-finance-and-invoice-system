import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AceOne Creative Agency — Finance System",
  description: "Internal invoicing, payments and expense management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} font-sans h-full antialiased`}
    >
      <body className="flex h-full min-h-screen font-sans" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

