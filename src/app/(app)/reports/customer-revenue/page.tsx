import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { ReportsNav } from "@/components/layout/reports-nav";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { PrintReportButton } from "@/components/reports/print-report-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCustomerRevenue } from "@/lib/db/queries/reports";
import { getPresetRange } from "@/lib/date-ranges";
import { formatMoney, sumMoney } from "@/lib/money";

export default async function CustomerRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const { from, to, preset } = await searchParams;
  const presetRange = preset ? getPresetRange(preset) : null;
  const dateFrom = presetRange?.from ?? from;
  const dateTo = presetRange?.to ?? to;

  const rows = await getCustomerRevenue({ dateFrom, dateTo });
  const total = sumMoney(rows.map((r) => r.total));

  return (
    <div>
      <PageHeader
        title="Customer-wise Revenue"
        description="How much billing each customer generated."
        actions={<PrintReportButton />}
      />
      <ReportsNav current="/reports/customer-revenue" />
      <DateRangeFilter basePath="/reports/customer-revenue" dateFrom={dateFrom} dateTo={dateTo} preset={preset} />

      {rows.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No invoices in this period.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.customerId}>
                  <TableCell>
                    <Link href={`/customers/${row.customerId}`} className="font-medium underline-offset-2 hover:underline">
                      {row.customerName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(row.total)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">{formatMoney(total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
