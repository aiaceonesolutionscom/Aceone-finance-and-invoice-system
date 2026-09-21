import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceStatusDonut, ReceivedVsOutstandingDonut } from "@/components/dashboard/donut-charts";
import { getDashboardSummary } from "@/lib/db/queries/dashboard";
import { formatMoney } from "@/lib/money";

function ViewAllAction({ href }: { href: string }) {
  return (
    <CardAction>
      <Button render={<Link href={href} />} variant="ghost" size="sm">
        View
      </Button>
    </CardAction>
  );
}

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  const statCards = [
    { label: "Total Invoiced", value: formatMoney(summary.totalInvoiced) },
    { label: "Total Received", value: formatMoney(summary.totalReceived) },
    { label: "Total Outstanding", value: formatMoney(summary.totalOutstanding) },
    { label: "Total Expenses", value: formatMoney(summary.totalExpenses) },
    { label: "Profit / Loss (Billed − Expenses)", value: formatMoney(summary.profitLoss) },
  ];

  const statusCards = [
    { label: "Unpaid Invoices", value: summary.unpaidCount },
    { label: "Partially Paid", value: summary.partialCount },
    { label: "Paid", value: summary.paidCount },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A quick financial snapshot, computed live from your invoices, payments and expenses."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statusCards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceStatusDonut
              unpaidCount={summary.unpaidCount}
              partialCount={summary.partialCount}
              paidCount={summary.paidCount}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Received vs Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <ReceivedVsOutstandingDonut
              totalReceived={summary.totalReceived.toString()}
              totalOutstanding={summary.totalOutstanding.toString()}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <ViewAllAction href="/invoices" />
          </CardHeader>
          <CardContent>
            {summary.recentInvoices.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No invoices yet.{" "}
                <Link href="/invoices/new" className="underline underline-offset-2">
                  Create your first invoice
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Link href={`/invoices/${inv.id}`} className="font-medium underline-offset-2 hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell>{inv.customer_name}</TableCell>
                      <TableCell className="text-right">{formatMoney(inv.current_invoice_total)}</TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={inv.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <ViewAllAction href="/payments" />
          </CardHeader>
          <CardContent>
            {summary.recentPayments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/invoices/${p.invoice_id}`} className="font-medium underline-offset-2 hover:underline">
                          {p.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell>{p.customer_name}</TableCell>
                      <TableCell>{p.payment_date}</TableCell>
                      <TableCell className="text-right">{formatMoney(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <ViewAllAction href="/expenses" />
          </CardHeader>
          <CardContent>
            {summary.recentExpenses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No expenses recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentExpenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.expense_name}</TableCell>
                      <TableCell>{e.expense_date}</TableCell>
                      <TableCell className="text-right">{formatMoney(e.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Outstanding Customers</CardTitle>
            <ViewAllAction href="/reports/outstanding" />
          </CardHeader>
          <CardContent>
            {summary.outstandingCustomers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No outstanding balances.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.outstandingCustomers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/customers/${c.id}`} className="font-medium underline-offset-2 hover:underline">
                          {c.customerName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-amber-700 dark:text-amber-400">
                        {formatMoney(c.outstanding)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
