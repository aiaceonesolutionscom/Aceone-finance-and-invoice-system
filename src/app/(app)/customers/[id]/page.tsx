import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { BackButton } from "@/components/layout/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceTable, type InvoiceRow } from "@/components/invoices/invoice-table";
import { getCustomerWithTotals } from "@/lib/db/queries/customers";
import { getCustomerStatement } from "@/lib/db/queries/reports";
import { formatMoney } from "@/lib/money";

type CustomerWithTotals = NonNullable<Awaited<ReturnType<typeof getCustomerWithTotals>>>;

function toRows(invoices: CustomerWithTotals["invoices"]): InvoiceRow[] {
  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    total: inv.currentInvoiceTotal,
    paid: inv.paid,
    remaining: inv.remaining,
    status: inv.status,
  }));
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, statement] = await Promise.all([
    getCustomerWithTotals(Number(id)),
    getCustomerStatement(Number(id)),
  ]);
  if (!data) notFound();

  const { customer, totals } = data;

  const cards = [
    { label: "Total Invoices", value: String(totals.totalInvoices) },
    { label: "Total Invoiced", value: formatMoney(totals.totalInvoiced) },
    { label: "Total Paid", value: formatMoney(totals.totalPaid) },
    { label: "Outstanding", value: formatMoney(totals.outstanding) },
  ];

  return (
    <div>
      <BackButton fallbackHref="/customers" />
      <PageHeader
        title={customer.customerName}
        description={customer.companyName ?? undefined}
        actions={
          <Button render={<Link href={`/customers/${customer.id}/edit`} />} variant="outline">
            <Pencil className="size-4" />
            Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Email: </span>
            {customer.email ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Phone: </span>
            {customer.phone ?? "—"}
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Address: </span>
            {customer.address ?? "—"}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="mt-6">
        <TabsList>
          <TabsTrigger value="all">All Invoices ({data.invoices.length})</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid ({data.unpaidInvoices.length})</TabsTrigger>
          <TabsTrigger value="partial">Partially Paid ({data.partiallyPaidInvoices.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({data.paidInvoices.length})</TabsTrigger>
          <TabsTrigger value="payments">Recent Payments</TabsTrigger>
          <TabsTrigger value="statement">Statement</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <InvoiceTable rows={toRows(data.invoices)} showActions />
        </TabsContent>
        <TabsContent value="unpaid" className="mt-4">
          <InvoiceTable rows={toRows(data.unpaidInvoices)} showActions />
        </TabsContent>
        <TabsContent value="partial" className="mt-4">
          <InvoiceTable rows={toRows(data.partiallyPaidInvoices)} showActions />
        </TabsContent>
        <TabsContent value="paid" className="mt-4">
          <InvoiceTable rows={toRows(data.paidInvoices)} showActions />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          {data.recentPayments.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No payments recorded yet.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell>{payment.paymentTime ?? "—"}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell className="text-right">{formatMoney(payment.amount)}</TableCell>
                      <TableCell>{payment.reference ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="statement" className="mt-4">
          {statement.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No transactions yet.
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right">{entry.debit ? formatMoney(entry.debit) : "—"}</TableCell>
                      <TableCell className="text-right">{entry.credit ? formatMoney(entry.credit) : "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(entry.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
