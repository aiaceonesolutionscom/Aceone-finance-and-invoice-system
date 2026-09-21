import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { CancelInvoiceButton } from "@/components/invoices/cancel-invoice-button";
import { DeleteInvoiceButton } from "@/components/invoices/delete-invoice-button";
import { formatMoney, money, type MoneyInput } from "@/lib/money";

export type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  customerName?: string;
  total: MoneyInput;
  paid: MoneyInput;
  remaining: MoneyInput;
  status: string;
};

export function InvoiceTable({
  rows,
  showCustomer = false,
  showActions = false,
}: {
  rows: InvoiceRow[];
  showCustomer?: boolean;
  showActions?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No invoices to show.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            {showCustomer ? <TableHead>Customer</TableHead> : null}
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
            <TableHead>Status</TableHead>
            {showActions ? <TableHead className="w-36" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const canEdit = row.status !== "CANCELLED";
            const canCancel = row.status !== "CANCELLED" && row.status !== "PAID";
            const canDelete = !money(row.paid).gt(0);
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/invoices/${row.id}`} className="font-medium underline-offset-2 hover:underline">
                    {row.invoiceNumber}
                  </Link>
                </TableCell>
                {showCustomer ? <TableCell>{row.customerName}</TableCell> : null}
                <TableCell>{row.invoiceDate}</TableCell>
                <TableCell className="text-right">{formatMoney(row.total)}</TableCell>
                <TableCell className="text-right">{formatMoney(row.paid)}</TableCell>
                <TableCell className="text-right">{formatMoney(row.remaining)}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={row.status} />
                </TableCell>
                {showActions ? (
                  <TableCell className="flex justify-end gap-1">
                    <Button render={<Link href={`/invoices/${row.id}`} />} variant="ghost" size="icon" aria-label={`View ${row.invoiceNumber}`}>
                      <Eye className="size-4" />
                    </Button>
                    {canEdit ? (
                      <Button
                        render={<Link href={`/invoices/${row.id}/edit`} />}
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${row.invoiceNumber}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    ) : null}
                    {canCancel ? <CancelInvoiceButton invoiceId={row.id} iconOnly /> : null}
                    {canDelete ? <DeleteInvoiceButton invoiceId={row.id} invoiceNumber={row.invoiceNumber} /> : null}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
