import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { Pencil, FileDown, Wallet } from "lucide-react";
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
import { getInvoiceById } from "@/lib/db/queries/invoices";
import { formatMoney, money, sumMoney } from "@/lib/money";

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

  const { invoice, items, payments, paid, remaining, previousInvoices, previousRemaining, totalAccountRemaining } = data;
  const includedPreviousOutstanding = Number(invoice.totalAmountDue) > Number(invoice.currentInvoiceTotal);
  const siblingInvoiceNumbers = new Set(
    payments.flatMap((p) => p.siblingInvoices.map((s) => s.invoiceNumber))
  );
  const relevantPreviousInvoices = previousInvoices
    .filter(
      (inv) =>
        money(inv.remaining).gt(0) ||
        siblingInvoiceNumbers.has(inv.invoiceNumber) ||
        inv.isContributedToThisInvoice
    )
    .map((inv) => ({
      ...inv,
      isPaidWithThisInvoice:
        siblingInvoiceNumbers.has(inv.invoiceNumber) ||
        Boolean(inv.isContributedToThisInvoice && money(inv.remaining).lte(0)),
    }));
  const pendingPreviousInvoices = relevantPreviousInvoices.filter((inv) => money(inv.remaining).gt(0));
  const hasPreviousInvoices = relevantPreviousInvoices.length > 0;
  const isPreviousSettled = hasPreviousInvoices && previousRemaining.lte(0);
  const isFullyPaid = remaining.lte(0) && (!hasPreviousInvoices || isPreviousSettled);

  const olderSiblingPayments = payments.flatMap((p) =>
    p.siblingInvoices.filter((s) => s.isOlderInvoice)
  );
  const totalPaidTowardsPrevious = sumMoney(olderSiblingPayments.map((s) => s.amount));
  const hasOlderSiblingPayments = totalPaidTowardsPrevious.gt(0);
  const grandTotalPaid = paid.plus(totalPaidTowardsPrevious);

  const canEdit = invoice.status !== "CANCELLED";
  const canCancel = invoice.status !== "CANCELLED" && invoice.status !== "PAID";
  const canRecordPayment = invoice.status !== "CANCELLED" && (remaining.gt(0) || pendingPreviousInvoices.length > 0);

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
                previousOutstandingInvoices={pendingPreviousInvoices.map((inv) => ({
                  id: inv.id,
                  invoiceNumber: inv.invoiceNumber,
                  remaining: inv.remaining,
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
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3.5 py-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <span>
                    Paid (This Invoice): <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(paid)}</strong>
                  </span>
                  {hasOlderSiblingPayments ? (
                    <span>
                      Paid (Previous Dues): <strong className="font-semibold text-primary">{formatMoney(totalPaidTowardsPrevious)}</strong>
                    </span>
                  ) : null}
                  {hasOlderSiblingPayments ? (
                    <span>
                      Total Received: <strong className="font-semibold text-foreground">{formatMoney(grandTotalPaid)}</strong>
                    </span>
                  ) : null}
                </div>
                <div>
                  Remaining: <strong className={`font-semibold ${remaining.gt(0) ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{formatMoney(remaining)}</strong>
                </div>
              </div>

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
                          <TableCell>
                            {methodLabels[payment.paymentMethod] ?? payment.paymentMethod}
                            {payment.siblingInvoices.length > 0 ? (
                              <span className="ml-1.5 text-xs text-muted-foreground">(This Invoice)</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatMoney(payment.amount)}</TableCell>
                          <TableCell>{payment.reference ?? "—"}</TableCell>
                          <TableCell>
                            <DeletePaymentButton paymentId={payment.id} />
                          </TableCell>
                        </TableRow>
                        {payment.siblingInvoices.length > 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="pt-0 pb-3 text-xs text-muted-foreground">
                              <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between font-medium text-foreground">
                                  <span>Combined Payment Breakdown:</span>
                                  <span className="text-primary font-semibold">
                                    Total Collected: {formatMoney(payment.batchTotal || payment.amount)}
                                  </span>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>• Applied to This Invoice ({invoice.invoiceNumber}):</span>
                                    <span className="font-medium text-foreground">{formatMoney(payment.amount)}</span>
                                  </div>
                                  {payment.siblingInvoices.map((s, i) => {
                                    const isOlder = s.isOlderInvoice ?? false;
                                    const method = methodLabels[s.paymentMethod || payment.paymentMethod] ?? payment.paymentMethod;
                                    return (
                                      <div key={i} className="flex justify-between text-muted-foreground">
                                        <span>
                                          {"• "}{isOlder ? "Paid towards previous invoice: " : "Paid with invoice: "}
                                          <strong className="font-medium text-foreground">{s.invoiceNumber}</strong> ({method})
                                        </span>
                                        <span className="font-medium text-foreground">{formatMoney(s.amount)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
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
              <CardTitle className="text-base">Totals & Balance</CardTitle>
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
                  <span>Previous Outstanding (at billing)</span>
                  <span>{formatMoney(invoice.previousOutstandingAmount)}</span>
                </div>
              ) : null}
              {includedPreviousOutstanding && isPreviousSettled ? (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Previous Balance Settled</span>
                  <span>- {formatMoney(invoice.previousOutstandingAmount)} (Paid)</span>
                </div>
              ) : null}
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>{isFullyPaid ? "Net Balance Due" : "Total Amount Due"}</span>
                <span className={isFullyPaid ? "text-emerald-700 dark:text-emerald-400" : ""}>
                  {isFullyPaid ? "PKR 0.00" : formatMoney(totalAccountRemaining)}
                </span>
              </div>
              {isFullyPaid ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  {"✓ All invoices and previous balances are fully settled."}
                </p>
              ) : includedPreviousOutstanding && previousRemaining.gt(0) ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Includes {formatMoney(previousRemaining)} still pending from earlier invoice(s).
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid (This Invoice)</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatMoney(paid)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Remaining (This Invoice)</span>
                <span className={remaining.lte(0) ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
                  {remaining.lte(0) ? "PKR 0.00 (Paid)" : formatMoney(remaining)}
                </span>
              </div>
              {hasOlderSiblingPayments ? (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Paid Towards Previous Dues</span>
                    <span className="font-semibold text-primary">{formatMoney(totalPaidTowardsPrevious)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Grand Total Received</span>
                    <span className="font-semibold text-foreground">{formatMoney(grandTotalPaid)}</span>
                  </div>
                </>
              ) : null}
              {hasPreviousInvoices ? (
                <>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Previous Invoices Balance</span>
                    <span className={isPreviousSettled ? "font-semibold text-emerald-700 dark:text-emerald-400" : "font-semibold text-amber-700 dark:text-amber-400"}>
                      {isPreviousSettled ? "Settled (PKR 0.00)" : formatMoney(previousRemaining)}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {relevantPreviousInvoices.map((prev) => {
                      const isSettled = money(prev.remaining).lte(0);
                      const paidWithThis = money(prev.amountPaidWithThisInvoice || 0);

                      let detailText: string | null = null;
                      let detailClass = "text-[11px] text-muted-foreground";

                      if (paidWithThis.gt(0)) {
                        detailClass = "text-[11px] font-medium text-primary";
                        if (isSettled) {
                          detailText = `\u2022 Fully Settled: ${formatMoney(paidWithThis)} paid with this invoice`;
                        } else {
                          detailText = `\u2022 Partial Payment: ${formatMoney(paidWithThis)} paid with this invoice (Remaining Due: ${formatMoney(prev.remaining)})`;
                        }
                      } else if (prev.isPaidWithThisInvoice) {
                        detailClass = "text-[11px] font-medium text-primary";
                        detailText = "\u2022 Paid together with this invoice";
                      } else if (isSettled) {
                        detailClass = "text-[11px] text-emerald-700 dark:text-emerald-400";
                        const totalPart = prev.total ? ` of ${formatMoney(prev.total)}` : "";
                        detailText = `\u2022 Settled earlier (Paid ${formatMoney(prev.paid)}${totalPart})`;
                      } else if (Number(prev.paid) > 0) {
                        const totalPart = prev.total ? ` of ${formatMoney(prev.total)}` : "";
                        detailText = `\u2022 Paid ${formatMoney(prev.paid)}${totalPart} (Remaining: ${formatMoney(prev.remaining)})`;
                      }

                      return (
                        <div key={prev.id} className="rounded-md border bg-muted/20 p-2.5 text-xs space-y-1">
                          <div className="flex justify-between items-center font-medium">
                            <span className="text-foreground">
                              {prev.invoiceNumber} <span className="text-muted-foreground font-normal">({prev.invoiceDate})</span>
                            </span>
                            <span className={isSettled ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-amber-700 dark:text-amber-400 font-semibold"}>
                              {isSettled ? "Settled (0.00)" : `Due: ${formatMoney(prev.remaining)}`}
                            </span>
                          </div>
                          {detailText ? (
                            <p className={detailClass}>
                              {detailText}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
