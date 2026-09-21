import Link from "next/link";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { SearchBox } from "@/components/layout/search-box";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { Pagination } from "@/components/layout/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAllPayments, getPaymentsGrandTotal } from "@/lib/db/queries/payments";
import { getPresetRange } from "@/lib/date-ranges";
import { formatMoney } from "@/lib/money";
import { paginationParams, totalPages as computeTotalPages } from "@/lib/pagination";

const methodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  OTHER: "Other",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; preset?: string; page?: string }>;
}) {
  const { q, from, to, preset, page } = await searchParams;
  const presetRange = preset ? getPresetRange(preset) : null;
  const dateFrom = presetRange?.from ?? from;
  const dateTo = presetRange?.to ?? to;
  const { page: currentPage, limit, offset } = paginationParams(page);

  const filter = { search: q, dateFrom, dateTo };
  const [{ rows: payments, total: rowCount }, total] = await Promise.all([
    listAllPayments({ ...filter, limit, offset }),
    getPaymentsGrandTotal(filter),
  ]);

  return (
    <div>
      <PageHeader title="Payments" description="Every payment recorded across all invoices." />

      <SearchBox
        action="/payments"
        defaultValue={q}
        placeholder="Search by customer, invoice, or reference..."
        extraHiddenParams={{ from: dateFrom, to: dateTo }}
      />
      <DateRangeFilter basePath="/payments" dateFrom={dateFrom} dateTo={dateTo} preset={preset} extraParams={{ q }} />

      <Card className="mb-4 max-w-xs">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments Received</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatMoney(total)}</p>
        </CardContent>
      </Card>

      {payments.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {q || dateFrom || dateTo ? "No payments match your filters." : "No payments recorded yet."}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.payment_date}</TableCell>
                  <TableCell>{payment.payment_time ?? "—"}</TableCell>
                  <TableCell>{payment.customer_name}</TableCell>
                  <TableCell>
                    <Link
                      href={`/invoices/${payment.invoice_id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {payment.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(payment.amount)}</TableCell>
                  <TableCell>{methodLabels[payment.payment_method] ?? payment.payment_method}</TableCell>
                  <TableCell>{payment.reference ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      render={<Link href={`/invoices/${payment.invoice_id}`} />}
                      variant="ghost"
                      size="icon"
                      aria-label={`View ${payment.invoice_number}`}
                      title="View invoice"
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination basePath="/payments" currentPage={currentPage} totalPages={computeTotalPages(rowCount)} extraParams={{ q, from: dateFrom, to: dateTo }} />
    </div>
  );
}
