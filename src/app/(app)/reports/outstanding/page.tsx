import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { ReportsNav } from "@/components/layout/reports-nav";
import { StatusFilterSelect } from "@/components/layout/status-filter-select";
import { Pagination } from "@/components/layout/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { getOutstandingInvoices } from "@/lib/db/queries/reports";
import { formatMoney } from "@/lib/money";
import { paginationParams, totalPages as computeTotalPages } from "@/lib/pagination";

const statusOptions = [
  { value: "ALL", label: "All (Unpaid + Partial)" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
];

export default async function OutstandingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const { page: currentPage, limit, offset } = paginationParams(page);
  const { invoices, total, totalOutstanding } = await getOutstandingInvoices({
    status: status || undefined,
    limit,
    offset,
  });

  return (
    <div>
      <PageHeader title="Outstanding / Receivables" description="Who has not paid, and how much." />
      <ReportsNav current="/reports/outstanding" />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <StatusFilterSelect basePath="/reports/outstanding" currentValue={status ?? "ALL"} options={statusOptions} />
        <Card className="w-56">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(totalOutstanding)}</p>
          </CardContent>
        </Card>
      </div>

      {invoices.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Nothing outstanding — everyone is paid up.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link href={`/customers/${inv.customerId}`} className="underline-offset-2 hover:underline">
                      {inv.customerName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/invoices/${inv.id}`} className="font-medium underline-offset-2 hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.invoiceDate}</TableCell>
                  <TableCell className="text-right">{formatMoney(inv.total)}</TableCell>
                  <TableCell className="text-right">{formatMoney(inv.paid)}</TableCell>
                  <TableCell className="text-right font-medium text-amber-700 dark:text-amber-400">
                    {formatMoney(inv.remaining)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={inv.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination basePath="/reports/outstanding" currentPage={currentPage} totalPages={computeTotalPages(total)} extraParams={{ status }} />
    </div>
  );
}
