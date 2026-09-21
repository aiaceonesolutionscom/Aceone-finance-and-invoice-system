import { PageHeader } from "@/components/layout/header";
import { SearchBox } from "@/components/layout/search-box";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { Pagination } from "@/components/layout/pagination";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseTable } from "@/components/expenses/expense-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listExpenses, getExpenseTotal } from "@/lib/db/queries/expenses";
import { getPresetRange } from "@/lib/date-ranges";
import { formatMoney } from "@/lib/money";
import { paginationParams, totalPages as computeTotalPages } from "@/lib/pagination";

export default async function ExpensesPage({
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
  const [{ rows: expenses, total: rowCount }, total] = await Promise.all([
    listExpenses({ ...filter, limit, offset }),
    getExpenseTotal(filter),
  ]);

  return (
    <div>
      <PageHeader title="Expenses" description="Track business expenses — no categories, just a name and amount." />

      <div className="space-y-6">
        <ExpenseForm />

        <SearchBox action="/expenses" defaultValue={q} placeholder="Search expenses by name..." extraHiddenParams={{ from: dateFrom, to: dateTo }} />
        <DateRangeFilter basePath="/expenses" dateFrom={dateFrom} dateTo={dateTo} preset={preset} extraParams={{ q }} />

        <Card className="max-w-xs">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(total)}</p>
          </CardContent>
        </Card>

        <div>
          <ExpenseTable expenses={expenses} />
          <Pagination basePath="/expenses" currentPage={currentPage} totalPages={computeTotalPages(rowCount)} extraParams={{ q, from: dateFrom, to: dateTo }} />
        </div>
      </div>
    </div>
  );
}
