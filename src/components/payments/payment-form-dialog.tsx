"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paymentMethods } from "@/lib/validation/payment";
import { createBulkPayment } from "@/actions/payments";
import { formatMoney, money } from "@/lib/money";

const methodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  OTHER: "Other",
};

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

type PreviousOutstandingInvoice = { id: number; invoiceNumber: string; remaining: string };

export function PaymentFormDialog({
  invoiceId,
  invoiceNumber,
  remaining,
  defaultOpen = false,
  previousOutstandingInvoices = [],
}: {
  invoiceId: number;
  invoiceNumber?: string;
  remaining: string;
  defaultOpen?: boolean;
  previousOutstandingInvoices?: PreviousOutstandingInvoice[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [isPending, startTransition] = useTransition();

  const [currentAmount, setCurrentAmount] = useState(remaining);
  const [prevAmounts, setPrevAmounts] = useState<Record<number, string>>({});
  const [paymentDate, setPaymentDate] = useState(nowDate());
  const [paymentTime, setPaymentTime] = useState(nowTime());
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasPrevious = previousOutstandingInvoices.length > 0;

  function handleSubmit() {
    setError(null);
    const entries = [
      { invoiceId, amount: currentAmount || "0" },
      ...previousOutstandingInvoices.map((inv) => ({ invoiceId: inv.id, amount: prevAmounts[inv.id] || "0" })),
    ];

    const total = entries.reduce((acc, e) => acc.plus(money(e.amount)), money(0));
    if (total.lte(0)) {
      setError("Enter at least one payment amount.");
      return;
    }

    startTransition(async () => {
      try {
        const results = await createBulkPayment({
          entries,
          paymentDate,
          paymentTime,
          paymentMethod,
          reference,
          notes,
        });
        const summary = results
          .map((r) => `${entries.length > 1 ? `#${r.invoiceId} ` : ""}${r.status.replace("_", " ")}`)
          .join(", ");
        toast.success(`Payment recorded — ${summary}`);
        setOpen(false);
        setCurrentAmount("0");
        setPrevAmounts({});
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record payment");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Wallet className="size-4" />
        Record Payment
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {invoiceNumber ? `${invoiceNumber} — ` : ""}Remaining balance: {formatMoney(remaining)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div>
            <Label className="mb-1 block text-sm">
              {hasPrevious ? "Amount for this invoice" : "Payment Amount"}
            </Label>
            <Input inputMode="decimal" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
          </div>

          {hasPrevious ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Also apply this payment to previous outstanding invoices
              </p>
              {previousOutstandingInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3">
                  <Label className="text-sm">
                    {inv.invoiceNumber}{" "}
                    <span className="text-xs text-muted-foreground">(remaining {formatMoney(inv.remaining)})</span>
                  </Label>
                  <Input
                    inputMode="decimal"
                    className="h-8 w-28"
                    value={prevAmounts[inv.id] ?? ""}
                    placeholder="0"
                    onChange={(e) => setPrevAmounts((prev) => ({ ...prev, [inv.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-sm">Date</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Time</Label>
              <Input type="time" value={paymentTime} onChange={(e) => setPaymentTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-sm">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as (typeof paymentMethods)[number])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m} value={m}>
                    {methodLabels[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 block text-sm">Reference</Label>
            <Input placeholder="Transaction ID, cheque no., etc." value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>

          <div>
            <Label className="mb-1 block text-sm">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="shrink-0">
          <Button type="button" disabled={isPending} onClick={handleSubmit}>
            Save Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
