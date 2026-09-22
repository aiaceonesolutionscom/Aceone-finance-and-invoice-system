import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { ReportsNav } from "@/components/layout/reports-nav";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { StatusFilterSelect } from "@/components/layout/status-filter-select";
import { Pagination } from "@/components/layout/pagination";
import { PrintReportButton } from "@/components/reports/print-report-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { listInvoices } from "@/lib/db/queries/invoices";
import { getPresetRange } from "@/lib/date-ranges";
import { formatMoney } from "@/lib/money";
import { paginationParams, totalPages as computeTotalPages } from "@/lib/pagination";

const statusOptions = [
  { value: "ALL", label: "All Statuses" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function InvoiceReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    preset?: string;
    customerId?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { from, to, preset, customerId, status, page } = await searchParams;
  const presetRange = preset ? getPresetRange(preset) : null;
  const dateFrom = presetRange?.from ?? from;
  const dateTo = presetRange?.to ?? to;
  const { page: currentPage, limit, offset } = paginationParams(page);

  const [{ rows, total }, allCustomers] = await Promise.all([
    listInvoices({
      dateFrom,
      dateTo,
      customerId: customerId && customerId !== "ALL" ? Number(customerId) : undefined,
      status: status && status !== "ALL" ? status : undefined,
      limit,
      offset,
    }),
    db.select().from(customers).orderBy(customers.customerName),
  ]);

  const customerOptions = [
    { value: "ALL", label: "All Customers" },
    ...allCustomers.map((c) => ({
      value: String(c.id),
      label: c.customerName,
      subLabel: c.companyName ?? undefined,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Invoice Report"
        description="Every invoice, with full totals and status."
        actions={<PrintReportButton />}
      />
      <ReportsNav current="/reports/invoices" />
      <DateRangeFilter basePath="/reports/invoices" dateFrom={dateFrom} dateTo={dateTo} preset={preset} extraParams={{ customerId, status }} />

      <div className="mb-4 flex flex-wrap gap-3">
        <StatusFilterSelect
          basePath="/reports/invoices"
          paramName="customerId"
          currentValue={customerId ?? "ALL"}
          options={customerOptions}
          extraParams={{ from: dateFrom, to: dateTo, preset, status }}
          className="h-9 w-56"
          searchable
          placeholder="Search customer..."
        />
        <StatusFilterSelect
          basePath="/reports/invoices"
          paramName="status"
          currentValue={status ?? "ALL"}
          options={statusOptions}
          extraParams={{ from: dateFrom, to: dateTo, preset, customerId }}
          className="h-9 w-48"
        />
      </div>

      {rows.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No invoices match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Current Total</TableHead>
                <TableHead className="text-right">Previous Outstanding</TableHead>
                <TableHead className="text-right">Total Amount Due</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link href={`/invoices/${inv.id}`} className="font-medium underline-offset-2 hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.customerName}</TableCell>
                  <TableCell>{inv.invoiceDate}</TableCell>
                  <TableCell className="text-right">{formatMoney(inv.currentInvoiceTotal)}</TableCell>
                  <TableCell className="text-right">{formatMoney(inv.previousOutstandingAmount)}</TableCell>
                  <TableCell className="text-right">{formatMoney(inv.totalAmountDue)}</TableCell>
                  <TableCell className="text-right">{formatMoney(inv.paid)}</TableCell>
                  <TableCell className="text-right">{formatMoney(inv.remaining)}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={inv.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        basePath="/reports/invoices"
        currentPage={currentPage}
        totalPages={computeTotalPages(total)}
        extraParams={{ from: dateFrom, to: dateTo, preset, customerId, status }}
      />
    </div>
  );
}
