import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { ReportsNav } from "@/components/layout/reports-nav";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBusinessOverview } from "@/lib/db/queries/reports";
import { getPresetRange } from "@/lib/date-ranges";
import { formatMoney } from "@/lib/money";

const methodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  OTHER: "Other",
};

export default async function ReportsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const { from, to, preset } = await searchParams;
  const presetRange = preset ? getPresetRange(preset) : null;
  const dateFrom = presetRange?.from ?? from;
  const dateTo = presetRange?.to ?? to;

  const overview = await getBusinessOverview({ dateFrom, dateTo });

  return (
    <div>
      <PageHeader title="Reports" description="Business overview for the selected period." />
      <ReportsNav current="/reports" />
      <DateRangeFilter basePath="/reports" dateFrom={dateFrom} dateTo={dateTo} preset={preset} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue (Invoiced)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(overview.totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Collections (Received)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(overview.totalReceived)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Receivables (Outstanding)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(overview.totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(overview.totalExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 max-w-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Profit / Loss (Billed Revenue − Expenses)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-semibold ${overview.profitLoss.gte(0) ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
            {formatMoney(overview.profitLoss)}
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="font-medium">{overview.invoiceCounts.paid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Partially Paid</span>
              <span className="font-medium">{overview.invoiceCounts.partial}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unpaid</span>
              <span className="font-medium">{overview.invoiceCounts.unpaid}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {overview.topCustomers.length === 0 ? (
              <p className="text-muted-foreground">No billing yet for this period.</p>
            ) : (
              overview.topCustomers.map((c) => (
                <div key={c.customerId} className="flex justify-between">
                  <Link href={`/customers/${c.customerId}`} className="underline-offset-2 hover:underline">
                    {c.customerName}
                  </Link>
                  <span className="font-medium">{formatMoney(c.total)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {overview.paymentMethodBreakdown.length === 0 ? (
              <p className="text-muted-foreground">No payments yet for this period.</p>
            ) : (
              overview.paymentMethodBreakdown.map((m) => (
                <div key={m.method} className="flex justify-between">
                  <span>{methodLabels[m.method] ?? m.method}</span>
                  <span className="font-medium">{formatMoney(m.total)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {overview.majorExpenses.length === 0 ? (
              <p className="text-muted-foreground">No expenses yet for this period.</p>
            ) : (
              overview.majorExpenses.map((e) => (
                <div key={e.expenseName} className="flex justify-between">
                  <span>{e.expenseName}</span>
                  <span className="font-medium">{formatMoney(e.total)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
