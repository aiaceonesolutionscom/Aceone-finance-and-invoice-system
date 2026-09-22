import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { ReportsNav } from "@/components/layout/reports-nav";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { StatusFilterSelect } from "@/components/layout/status-filter-select";
import { PrintReportButton } from "@/components/reports/print-report-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  getExpenseCategoryBreakdown,
  getCategoryGroupedExpenses,
  getExpenseTotal,
} from "@/lib/db/queries/expenses";
import { listExpenseCategories } from "@/lib/db/queries/expense-categories";
import { getPresetRange } from "@/lib/date-ranges";
import { formatMoney } from "@/lib/money";

export default async function ExpenseAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string; categoryId?: string }>;
}) {
  const { from, to, preset, categoryId } = await searchParams;
  const presetRange = preset ? getPresetRange(preset) : null;
  const dateFrom = presetRange?.from ?? from;
  const dateTo = presetRange?.to ?? to;

  const selectedCategoryId = categoryId && categoryId !== "ALL" ? Number(categoryId) : undefined;
  const dateFilter = { dateFrom, dateTo };
  const filter = { ...dateFilter, categoryId: selectedCategoryId };

  const [categories, categoryBreakdown, groupedCategories, overallTotal, filteredTotal] = await Promise.all([
    listExpenseCategories(),
    getExpenseCategoryBreakdown(dateFilter),
    getCategoryGroupedExpenses(filter),
    getExpenseTotal(dateFilter),
    getExpenseTotal(filter),
  ]);

  const selectedCategory = selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : null;
  const categoryOptions = [
    { value: "ALL", label: "All Categories" },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  return (
    <div>
      <PageHeader
        title="Expense Analysis"
        description="Where is the money going? Track expenses by category and itemized spend."
        actions={<PrintReportButton />}
      />
      <ReportsNav current="/reports/expenses" />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <DateRangeFilter
          basePath="/reports/expenses"
          dateFrom={dateFrom}
          dateTo={dateTo}
          preset={preset}
          extraParams={{ categoryId }}
        />
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Category</label>
          <StatusFilterSelect
            basePath="/reports/expenses"
            paramName="categoryId"
            currentValue={categoryId ?? "ALL"}
            options={categoryOptions}
            extraParams={{ from: dateFrom, to: dateTo, preset }}
            className="h-8 w-52"
            searchable
            placeholder="Search category..."
          />
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {selectedCategory ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Category: {selectedCategory.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatMoney(filteredTotal)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {overallTotal.gt(0)
                    ? filteredTotal.dividedBy(overallTotal).times(100).toFixed(1)
                    : "0.0"}% of total expenses
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Overall Period Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatMoney(overallTotal)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Across all categories in this period</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatMoney(overallTotal)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Across all categories in this period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{categoryBreakdown.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Categories with recorded expenses</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {groupedCategories.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No expenses in this period.
        </div>
      ) : selectedCategory ? (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Itemized Expenses in {selectedCategory.name}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Detailed breakdown of what was spent in this category
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {groupedCategories[0]?.items.length ?? 0}{" "}
              {groupedCategories[0]?.items.length === 1 ? "Item" : "Items"}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense Name</TableHead>
                  <TableHead className="text-center">Entries</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">% of Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedCategories[0]?.items.map((item) => {
                  const pct = filteredTotal.gt(0)
                    ? item.total.dividedBy(filteredTotal).times(100).toFixed(1)
                    : "0.0";
                  return (
                    <TableRow key={item.expenseName}>
                      <TableCell className="font-medium">{item.expenseName}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.count}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(item.total)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{pct}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryBreakdown.map((row) => (
                    <TableRow key={row.categoryName}>
                      <TableCell className="font-medium">{row.categoryName}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.total)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {overallTotal.gt(0) ? row.total.dividedBy(overallTotal).times(100).toFixed(1) : "0.0"}%
                      </TableCell>
                      <TableCell className="text-right">
                        {row.categoryId ? (
                          <Link
                            href={`/reports/expenses?${new URLSearchParams({
                              ...(dateFrom ? { from: dateFrom } : {}),
                              ...(dateTo ? { to: dateTo } : {}),
                              ...(preset ? { preset } : {}),
                              categoryId: String(row.categoryId),
                            })}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            View Details &rarr;
                          </Link>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-base font-semibold">Category-wise Detailed Breakdown</h2>
            {groupedCategories.map((group) => (
              <Card key={group.categoryName}>
                <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
                  <div>
                    <CardTitle className="text-base font-medium">{group.categoryName}</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Total: <span className="font-semibold text-foreground">{formatMoney(group.total)}</span>
                      {overallTotal.gt(0)
                        ? ` (${group.total.dividedBy(overallTotal).times(100).toFixed(1)}% of all expenses)`
                        : ""}
                    </p>
                  </div>
                  {group.categoryId ? (
                    <Link
                      href={`/reports/expenses?${new URLSearchParams({
                        ...(dateFrom ? { from: dateFrom } : {}),
                        ...(dateTo ? { to: dateTo } : {}),
                        ...(preset ? { preset } : {}),
                        categoryId: String(group.categoryId),
                      })}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Filter this category &rarr;
                    </Link>
                  ) : null}
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense Item</TableHead>
                        <TableHead className="text-center">Entries</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">% of Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item) => (
                        <TableRow key={item.expenseName}>
                          <TableCell className="font-medium">{item.expenseName}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{item.count}</TableCell>
                          <TableCell className="text-right font-medium">{formatMoney(item.total)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {group.total.gt(0)
                              ? item.total.dividedBy(group.total).times(100).toFixed(1)
                              : "0.0"}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
