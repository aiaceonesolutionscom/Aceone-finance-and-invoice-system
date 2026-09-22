import { PageHeader } from "@/components/layout/header";
import { SearchBox } from "@/components/layout/search-box";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { StatusFilterSelect } from "@/components/layout/status-filter-select";
import { Pagination } from "@/components/layout/pagination";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseTable } from "@/components/expenses/expense-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listExpenses, getExpenseTotal } from "@/lib/db/queries/expenses";
import { listExpenseCategories } from "@/lib/db/queries/expense-categories";
import { getPresetRange } from "@/lib/date-ranges";
import { formatMoney } from "@/lib/money";
import { paginationParams, totalPages as computeTotalPages } from "@/lib/pagination";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; preset?: string; page?: string; categoryId?: string }>;
}) {
  const { q, from, to, preset, page, categoryId } = await searchParams;
  const presetRange = preset ? getPresetRange(preset) : null;
  const dateFrom = presetRange?.from ?? from;
  const dateTo = presetRange?.to ?? to;
  const { page: currentPage, limit, offset } = paginationParams(page);

  const filter = {
    search: q,
    dateFrom,
    dateTo,
    categoryId: categoryId && categoryId !== "ALL" ? Number(categoryId) : undefined,
  };
  const [{ rows: expenses, total: rowCount }, total, categories] = await Promise.all([
    listExpenses({ ...filter, limit, offset }),
    getExpenseTotal(filter),
    listExpenseCategories(),
  ]);

  const categoryOptions = [
    { value: "ALL", label: "All Categories" },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  return (
    <div>
      <PageHeader title="Expenses" description="Track business expenses by name, category, and amount." />

      <div className="space-y-6">
        <ExpenseForm categories={categories} />

        <SearchBox
          action="/expenses"
          defaultValue={q}
          placeholder="Search expenses by name..."
          extraHiddenParams={{ from: dateFrom, to: dateTo, categoryId }}
        />
        <DateRangeFilter basePath="/expenses" dateFrom={dateFrom} dateTo={dateTo} preset={preset} extraParams={{ q, categoryId }} />

        <div className="flex flex-wrap items-end gap-4">
          <StatusFilterSelect
            basePath="/expenses"
            paramName="categoryId"
            currentValue={categoryId ?? "ALL"}
            options={categoryOptions}
            extraParams={{ q, from: dateFrom, to: dateTo, preset }}
            className="h-9 w-56"
            searchable
            placeholder="Search category..."
          />
          <Card className="max-w-xs">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatMoney(total)}</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <ExpenseTable
            expenses={expenses.map((e) => ({ ...e, amount: e.amount.toFixed(2) }))}
            categories={categories}
          />
          <Pagination
            basePath="/expenses"
            currentPage={currentPage}
            totalPages={computeTotalPages(rowCount)}
            extraParams={{ q, from: dateFrom, to: dateTo, categoryId }}
          />
        </div>
      </div>
    </div>
  );
}
