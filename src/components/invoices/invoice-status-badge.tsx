import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  UNPAID: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PARTIALLY_PAID: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-medium", statusStyles[status])}
    >
      {statusLabels[status] ?? status}
    </Badge>
  );
}
