import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { ReportsNav } from "@/components/layout/reports-nav";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { StatusFilterSelect } from "@/components/layout/status-filter-select";
import { Pagination } from "@/components/layout/pagination";
import { PrintReportButton } from "@/components/reports/print-report-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { listAllPayments, getPaymentsGrandTotal } from "@/lib/db/queries/payments";
import { getPresetRange } from "@/lib/date-ranges";
import { formatMoney } from "@/lib/money";
import { paginationParams, totalPages as computeTotalPages } from "@/lib/pagination";

const methodOptions = ["ALL", "CASH", "BANK_TRANSFER", "CHEQUE", "JAZZCASH", "EASYPAISA", "OTHER"];
const methodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  OTHER: "Other",
};

export default async function PaymentReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    preset?: string;
    customerId?: string;
    method?: string;
    page?: string;
  }>;
}) {
  const { from, to, preset, customerId, method, page } = await searchParams;
  const presetRange = preset ? getPresetRange(preset) : null;
  const dateFrom = presetRange?.from ?? from;
  const dateTo = presetRange?.to ?? to;
  const { page: currentPage, limit, offset } = paginationParams(page);

  const filter = {
    dateFrom,
    dateTo,
    customerId: customerId && customerId !== "ALL" ? Number(customerId) : undefined,
    paymentMethod: method && method !== "ALL" ? method : undefined,
  };
  const [{ rows, total: rowCount }, allCustomers, total] = await Promise.all([
    listAllPayments({ ...filter, limit, offset }),
    db.select().from(customers).orderBy(customers.customerName),
    getPaymentsGrandTotal(filter),
  ]);

  const customerOptions = [
    { value: "ALL", label: "All Customers" },
    ...allCustomers.map((c) => ({
      value: String(c.id),
      label: c.customerName,
      subLabel: c.companyName ?? undefined,
    })),
  ];
  const methodSelectOptions = methodOptions.map((m) => ({ value: m, label: m === "ALL" ? "All Methods" : methodLabels[m] }));

  return (
    <div>
      <PageHeader
        title="Payment Report"
        description="Every payment, filterable by customer, method, and date."
        actions={<PrintReportButton />}
      />
      <ReportsNav current="/reports/payments" />
      <DateRangeFilter basePath="/reports/payments" dateFrom={dateFrom} dateTo={dateTo} preset={preset} extraParams={{ customerId, method }} />

      <div className="mb-4 flex flex-wrap gap-3">
        <StatusFilterSelect
          basePath="/reports/payments"
          paramName="customerId"
          currentValue={customerId ?? "ALL"}
          options={customerOptions}
          extraParams={{ from: dateFrom, to: dateTo, preset, method }}
          className="h-9 w-56"
          searchable
          placeholder="Search customer..."
        />
        <StatusFilterSelect
          basePath="/reports/payments"
          paramName="method"
          currentValue={method ?? "ALL"}
          options={methodSelectOptions}
          extraParams={{ from: dateFrom, to: dateTo, preset, customerId }}
          className="h-9 w-48"
        />
      </div>

      <Card className="mb-4 max-w-xs">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments Received</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatMoney(total)}</p>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No payments match these filters.
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.payment_date}</TableCell>
                  <TableCell>{payment.payment_time ?? "—"}</TableCell>
                  <TableCell>{payment.customer_name}</TableCell>
                  <TableCell>
                    <Link href={`/invoices/${payment.invoice_id}`} className="font-medium underline-offset-2 hover:underline">
                      {payment.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(payment.amount)}</TableCell>
                  <TableCell>{methodLabels[payment.payment_method] ?? payment.payment_method}</TableCell>
                  <TableCell>{payment.reference ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        basePath="/reports/payments"
        currentPage={currentPage}
        totalPages={computeTotalPages(rowCount)}
        extraParams={{ from: dateFrom, to: dateTo, preset, customerId, method }}
      />
    </div>
  );
}
