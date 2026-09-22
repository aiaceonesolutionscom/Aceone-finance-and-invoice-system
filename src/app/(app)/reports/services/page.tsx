import Link from "next/link";
import { db } from "@/lib/db";
import { customers, services } from "@/lib/db/schema";
import { getServicesReport } from "@/lib/db/queries/reports";
import { formatMoney, money } from "@/lib/money";
import { paginationParams, totalPages } from "@/lib/pagination";
import { getPresetRange } from "@/lib/date-ranges";
import { PageHeader } from "@/components/layout/header";
import { ReportsNav } from "@/components/layout/reports-nav";
import { DateRangeFilter } from "@/components/layout/date-range-filter";
import { StatusFilterSelect } from "@/components/layout/status-filter-select";
import { Pagination } from "@/components/layout/pagination";
import { PrintReportButton } from "@/components/reports/print-report-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusBadges: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PAID: { label: "Paid", variant: "default" },
  PARTIALLY_PAID: { label: "Partially Paid", variant: "secondary" },
  UNPAID: { label: "Unpaid", variant: "destructive" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
};

export default async function ServicesReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    preset?: string;
    serviceId?: string;
    customerId?: string;
    page?: string;
  }>;
}) {
  const { from, to, preset, serviceId, customerId, page } = await searchParams;
  const presetRange = preset ? getPresetRange(preset) : null;
  const dateFrom = presetRange?.from ?? from;
  const dateTo = presetRange?.to ?? to;
  const { page: currentPage, limit, offset } = paginationParams(page);

  const selectedServiceId = serviceId && serviceId !== "ALL" ? Number(serviceId) : undefined;
  const selectedCustomerId = customerId && customerId !== "ALL" ? Number(customerId) : undefined;

  const [report, allServices, allCustomers] = await Promise.all([
    getServicesReport({
      serviceId: selectedServiceId,
      customerId: selectedCustomerId,
      dateFrom,
      dateTo,
      limit,
      offset,
    }),
    db.select().from(services).orderBy(services.name),
    db.select().from(customers).orderBy(customers.customerName),
  ]);

  const serviceOptions = [
    { value: "ALL", label: "All Services" },
    ...allServices.map((s) => ({ value: String(s.id), label: s.name })),
  ];

  const customerOptions = [
    { value: "ALL", label: "All Customers" },
    ...allCustomers.map((c) => ({
      value: String(c.id),
      label: c.customerName,
      subLabel: c.companyName ?? undefined,
    })),
  ];

  const pages = totalPages(report.totalCount);
  const totalRev = report.totals.totalRevenue;

  return (
    <div>
      <PageHeader
        title="Services Sold Report"
        description="Track which services were sold, to which customers, for how much, and total revenue generated."
        actions={<PrintReportButton />}
      />

      <ReportsNav current="/reports/services" />

      {/* Filters Bar */}
      <div className="mb-6 flex flex-wrap items-end gap-3 print:hidden">
        <DateRangeFilter
          basePath="/reports/services"
          dateFrom={dateFrom}
          dateTo={dateTo}
          preset={preset}
          extraParams={{ serviceId, customerId }}
        />

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Service</label>
          <StatusFilterSelect
            basePath="/reports/services"
            paramName="serviceId"
            currentValue={serviceId ?? "ALL"}
            options={serviceOptions}
            extraParams={{ from: dateFrom, to: dateTo, preset, customerId }}
            className="h-9 w-52"
            searchable
            placeholder="Search service..."
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Customer</label>
          <StatusFilterSelect
            basePath="/reports/services"
            paramName="customerId"
            currentValue={customerId ?? "ALL"}
            options={customerOptions}
            extraParams={{ from: dateFrom, to: dateTo, preset, serviceId }}
            className="h-9 w-56"
            searchable
            placeholder="Search customer..."
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatMoney(report.totals.totalRevenue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">from services sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Units / Items Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.totals.totalItems}</p>
            <p className="mt-1 text-xs text-muted-foreground">service line items billed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Customers Served
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.totals.totalCustomers}</p>
            <p className="mt-1 text-xs text-muted-foreground">unique clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Top Selling Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-lg font-bold">
              {report.breakdown[0]?.serviceName ?? "None"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.breakdown[0] ? `${formatMoney(report.breakdown[0].totalRevenue)} (${report.breakdown[0].unitsSold} sold)` : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Itemized Sales vs Service Breakdown */}
      <Tabs defaultValue="itemized" className="space-y-4">
        <TabsList className="print:hidden">
          <TabsTrigger value="itemized">Itemized Sales ({report.totalCount})</TabsTrigger>
          <TabsTrigger value="breakdown">Service Performance ({report.breakdown.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Itemized Sales Table */}
        <TabsContent value="itemized" className="space-y-4">
          {report.items.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No service sales match these filters.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service Sold</TableHead>
                      <TableHead className="text-right">Rate / Price (PKR)</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.items.map((item) => {
                      const badge = statusBadges[item.invoiceStatus] ?? {
                        label: item.invoiceStatus,
                        variant: "outline" as const,
                      };
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap font-medium text-muted-foreground">
                            {item.invoiceDate}
                          </TableCell>
                          <TableCell className="font-semibold">
                            <Link
                              href={`/invoices/${item.invoiceId}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {item.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div>
                              <Link
                                href={`/customers/${item.customerId}`}
                                className="font-medium hover:underline"
                              >
                                {item.customerName}
                              </Link>
                              {item.companyName ? (
                                <p className="text-xs text-muted-foreground">{item.companyName}</p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{item.serviceName}</span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatMoney(item.rate)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                basePath="/reports/services"
                currentPage={currentPage}
                totalPages={pages}
                extraParams={{
                  from: dateFrom,
                  to: dateTo,
                  preset,
                  serviceId,
                  customerId,
                }}
              />
            </>
          )}
        </TabsContent>

        {/* Tab 2: Service Performance Breakdown */}
        <TabsContent value="breakdown" className="space-y-4">
          {report.breakdown.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No service sales data available.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Service Name</TableHead>
                    <TableHead className="text-center">Units Sold</TableHead>
                    <TableHead className="text-center">Unique Customers</TableHead>
                    <TableHead className="text-right">Avg Rate (PKR)</TableHead>
                    <TableHead className="text-right">Total Revenue (PKR)</TableHead>
                    <TableHead className="text-right">Share of Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.breakdown.map((b) => {
                    const sharePct = totalRev.gt(0)
                      ? b.totalRevenue.dividedBy(totalRev).times(100).toFixed(1)
                      : "0.0";
                    return (
                      <TableRow key={b.serviceName}>
                        <TableCell className="font-semibold">{b.serviceName}</TableCell>
                        <TableCell className="text-center">{b.unitsSold}</TableCell>
                        <TableCell className="text-center">{b.uniqueCustomers}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatMoney(b.avgRate)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatMoney(b.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            {sharePct}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

