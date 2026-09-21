import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { Pencil, FileDown } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { BackButton } from "@/components/layout/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import { DeletePaymentButton } from "@/components/payments/delete-payment-button";
import { CancelInvoiceButton } from "@/components/invoices/cancel-invoice-button";
import { getInvoiceById, getPreviousOutstanding } from "@/lib/db/queries/invoices";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

const methodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  OTHER: "Other",
};

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ openPayment?: string }>;
}) {
  const { id } = await params;
  const { openPayment } = await searchParams;
  const data = await getInvoiceById(Number(id));
  if (!data) notFound();

  const { invoice, items, payments, paid, remaining } = data;
  const includedPreviousOutstanding = Number(invoice.totalAmountDue) > Number(invoice.currentInvoiceTotal);
  // Only offer to split a payment toward the customer's other outstanding
  // invoices when THIS invoice actually rolled that balance into its own
  // total — if the operator deliberately left it out, this invoice has no
  // business showing or settling that unrelated balance.
  const { invoices: previousOutstandingInvoices } = includedPreviousOutstanding
    ? await getPreviousOutstanding(db, invoice.customerId, invoice.id)
    : { invoices: [] };
  const canEdit = invoice.status !== "CANCELLED";
  const canCancel = invoice.status !== "CANCELLED" && invoice.status !== "PAID";
  const canRecordPayment = invoice.status !== "CANCELLED" && (remaining.gt(0) || previousOutstandingInvoices.length > 0);

  return (
    <div>
      <BackButton fallbackHref="/invoices" />
      <PageHeader
        title={invoice.invoiceNumber}
        description={invoice.invoiceDate}
        actions={
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            <Button render={<Link href={`/invoices/${invoice.id}/pdf`} target="_blank" />} variant="outline">
              <FileDown className="size-4" />
              Generate PDF
            </Button>
            {canEdit ? (
              <Button render={<Link href={`/invoices/${invoice.id}/edit`} />} variant="outline">
                <Pencil className="size-4" />
                Edit
              </Button>
            ) : null}
            {canCancel ? <CancelInvoiceButton invoiceId={invoice.id} /> : null}
            {canRecordPayment ? (
              <PaymentFormDialog
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoiceNumber}
                remaining={remaining.toFixed(2)}
                defaultOpen={openPayment === "1"}
                previousOutstandingInvoices={previousOutstandingInvoices.map((inv) => ({
                  id: inv.id,
                  invoiceNumber: inv.invoiceNumber,
                  remaining: inv.remaining.toFixed(2),
                }))}
              />
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bill To</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Name: </span>
                {invoice.customerSnapshot.customerName}
              </div>
              <div>
                <span className="text-muted-foreground">Company: </span>
                {invoice.customerSnapshot.companyName ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Email: </span>
                {invoice.customerSnapshot.email ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Phone: </span>
                {invoice.customerSnapshot.phone ?? "—"}
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Address: </span>
                {invoice.customerSnapshot.address ?? "—"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.serviceNameSnapshot}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.rate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <Fragment key={payment.id}>
                        <TableRow>
                          <TableCell>{payment.paymentDate}</TableCell>
                          <TableCell>{payment.paymentTime ?? "—"}</TableCell>
                          <TableCell>{methodLabels[payment.paymentMethod] ?? payment.paymentMethod}</TableCell>
                          <TableCell className="text-right">{formatMoney(payment.amount)}</TableCell>
                          <TableCell>{payment.reference ?? "—"}</TableCell>
                          <TableCell>
                            <DeletePaymentButton paymentId={payment.id} />
                          </TableCell>
                        </TableRow>
                        {payment.siblingInvoices.length > 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="pt-0 pb-2 text-xs text-muted-foreground">
                              This payment was recorded together with:{" "}
                              {payment.siblingInvoices.map((s, i) => (
                                <span key={i}>
                                  {i > 0 ? ", " : ""}
                                  <span className="font-medium text-foreground">{s.invoiceNumber}</span> (
                                  {formatMoney(s.amount)})
                                </span>
                              ))}
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(invoice.subtotal)}</span>
              </div>
              {Number(invoice.discount) > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>{formatMoney(invoice.discount)}</span>
                </div>
              ) : null}
              {invoice.taxNameSnapshot ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {invoice.taxNameSnapshot} ({invoice.taxRateSnapshot}%)
                  </span>
                  <span>{formatMoney(invoice.taxAmount)}</span>
                </div>
              ) : null}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Current Invoice Total</span>
                <span>{formatMoney(invoice.currentInvoiceTotal)}</span>
              </div>
              {includedPreviousOutstanding ? (
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span>Previous Outstanding</span>
                  <span>{formatMoney(invoice.previousOutstandingAmount)}</span>
                </div>
              ) : null}
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total Amount Due</span>
                <span>{formatMoney(invoice.totalAmountDue)}</span>
              </div>
              {includedPreviousOutstanding ? (
                <p className="text-xs text-muted-foreground">
                  Includes {formatMoney(invoice.previousOutstandingAmount)} still owed from an earlier invoice — paying off this invoice does not clear that balance.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Summary (This Invoice)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid</span>
                <span>{formatMoney(paid)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Remaining (This Invoice)</span>
                <span>{formatMoney(remaining)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
