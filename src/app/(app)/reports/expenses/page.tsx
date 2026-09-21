import { PageHeader } from "@/components/layout/header";
import { ReportsNav } from "@/components/layout/reports-nav";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getExpenseBreakdown, getExpenseTotal } from "@/lib/db/queries/expenses";
import { getPresetRange } from "@/lib/date-ranges";
import { formatMoney } from "@/lib/money";

export default async function ExpenseAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const { from, to, preset } = await searchParams;
  const presetRange = preset ? getPresetRange(preset) : null;
  const dateFrom = presetRange?.from ?? from;
  const dateTo = presetRange?.to ?? to;

  const filter = { dateFrom, dateTo };
  const [breakdown, total] = await Promise.all([getExpenseBreakdown(filter), getExpenseTotal(filter)]);

  return (
    <div>
      <PageHeader title="Expense Analysis" description="Where is the money going? Sorted highest first." />
      <ReportsNav current="/reports/expenses" />
      <DateRangeFilter basePath="/reports/expenses" dateFrom={dateFrom} dateTo={dateTo} preset={preset} />

      <Card className="mb-4 max-w-xs">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatMoney(total)}</p>
        </CardContent>
      </Card>

      {breakdown.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No expenses in this period.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense Name</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.map((row) => (
                <TableRow key={row.expenseName}>
                  <TableCell>{row.expenseName}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
