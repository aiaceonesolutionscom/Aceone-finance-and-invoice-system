import Link from "next/link";
import { cn } from "cn";

const reportLinks = [
  { href: "/reports", label: "Business Overview" },
  { href: "/reports/outstanding", label: "Outstanding" },
  { href: "/reports/customer-revenue", label: "Customer Revenue" },
  { href: "/reports/services", label: "Services Sold" },
  { href: "/reports/invoices", label: "Invoices" },
  { href: "/reports/payments", label: "Payments" },
  { href: "/reports/expenses", label: "Expense Analysis" },
  { href: "/reports/profit-loss", label: "Profit / Loss" },
];

export function ReportsNav({ current }: { current: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b pb-2">
      {reportLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            current === link.href
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
