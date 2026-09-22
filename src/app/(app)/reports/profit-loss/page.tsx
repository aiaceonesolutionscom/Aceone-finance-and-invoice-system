import { PageHeader } from "@/components/layout/header";
import { ReportsNav } from "@/components/layout/reports-nav";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfitLoss } from "@/lib/db/queries/reports";
import { getPresetRange } from "@/lib/date-ranges";
import { formatMoney } from "@/lib/money";
import { PrintReportButton } from "@/components/reports/print-report-button";

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const { from, to, preset } = await searchParams;
  const presetRange = preset ? getPresetRange(preset) : null;
  const dateFrom = presetRange?.from ?? from;
  const dateTo = presetRange?.to ?? to;

  const pl = await getProfitLoss({ dateFrom, dateTo });

  return (
    <div>
      <PageHeader title="Profit / Loss" description="Billed-revenue view: Total Invoiced minus Total Expenses." />
      <PageHeader
        title="Profit / Loss"
        description="Billed-revenue view: Total Invoiced minus Total Expenses."
        actions={<PrintReportButton />}
      />
      <ReportsNav current="/reports/profit-loss" />
      <DateRangeFilter basePath="/reports/profit-loss" dateFrom={dateFrom} dateTo={dateTo} preset={preset} />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Billed-Revenue Profit / Loss</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Invoiced</span>
            <span className="font-medium">{formatMoney(pl.totalInvoiced)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Expenses</span>
            <span className="font-medium">{formatMoney(pl.totalExpenses)}</span>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <span>Profit / Loss</span>
            <span className={pl.profitLoss.gte(0) ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
              {formatMoney(pl.profitLoss)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-md">
        <CardHeader>
          <CardTitle>Cash Position (for reference — not mixed into the calculation above)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cash Received</span>
            <span className="font-medium">{formatMoney(pl.totalReceived)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Outstanding (Invoiced but not yet received)</span>
            <span className="font-medium">{formatMoney(pl.totalOutstanding)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
