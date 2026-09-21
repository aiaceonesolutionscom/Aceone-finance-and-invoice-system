import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/layout/search-box";
import { StatusFilterSelect } from "@/components/layout/status-filter-select";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { Pagination } from "@/components/layout/pagination";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { listInvoices } from "@/lib/db/queries/invoices";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { getPresetRange } from "@/lib/date-ranges";
import { paginationParams, totalPages as computeTotalPages } from "@/lib/pagination";

const statusOptions = [
  { value: "ALL", label: "All Statuses" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    customerId?: string;
    from?: string;
    to?: string;
    preset?: string;
  }>;
}) {
  const { status, q, page, customerId, from, to, preset } = await searchParams;
  const presetRange = preset ? getPresetRange(preset) : null;
  const dateFrom = presetRange?.from ?? from;
  const dateTo = presetRange?.to ?? to;
  const { page: currentPage, limit, offset } = paginationParams(page);

  const [{ rows: invoices, total }, allCustomers] = await Promise.all([
    listInvoices({
      status: status && status !== "ALL" ? status : undefined,
      search: q,
      customerId: customerId && customerId !== "ALL" ? Number(customerId) : undefined,
      dateFrom,
      dateTo,
      limit,
      offset,
    }),
    db.select().from(customers).orderBy(customers.customerName),
  ]);

  const customerOptions = [
    { value: "ALL", label: "All Customers" },
    ...allCustomers.map((c) => ({ value: String(c.id), label: c.customerName })),
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        actions={
          <Button render={<Link href="/invoices/new" />}>
            <Plus className="size-4" />
            Create Invoice
          </Button>
        }
      />

      <SearchBox
        action="/invoices"
        defaultValue={q}
        placeholder="Search by invoice number, customer, or company..."
        extraHiddenParams={{ status: status ?? "", customerId: customerId ?? "", from: dateFrom, to: dateTo, preset }}
      />

      <DateRangeFilter
        basePath="/invoices"
        dateFrom={dateFrom}
        dateTo={dateTo}
        preset={preset}
        extraParams={{ q, status, customerId }}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <StatusFilterSelect
          basePath="/invoices"
          currentValue={status ?? "ALL"}
          options={statusOptions}
          extraParams={{ q, customerId, from: dateFrom, to: dateTo, preset }}
        />
        <StatusFilterSelect
          basePath="/invoices"
          paramName="customerId"
          currentValue={customerId ?? "ALL"}
          options={customerOptions}
          extraParams={{ q, status, from: dateFrom, to: dateTo, preset }}
          className="h-9 w-56"
        />
      </div>

      <InvoiceTable
        showCustomer
        showActions
        rows={invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          customerName: inv.companyName ? `${inv.customerName} (${inv.companyName})` : inv.customerName,
          total: inv.currentInvoiceTotal,
          paid: inv.paid,
          remaining: inv.remaining,
          status: inv.status,
        }))}
      />

      <Pagination
        basePath="/invoices"
        currentPage={currentPage}
        totalPages={computeTotalPages(total)}
        extraParams={{ q, status, customerId, from: dateFrom, to: dateTo, preset }}
      />
    </div>
  );
}
