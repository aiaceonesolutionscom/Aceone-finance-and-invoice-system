"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wallet, AlertCircle } from "lucide-react";
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
  const [prevAmounts, setPrevAmounts] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const inv of previousOutstandingInvoices) {
      initial[inv.id] = inv.remaining;
    }
    return initial;
  });
  const [paymentDate, setPaymentDate] = useState(nowDate());
  const [paymentTime, setPaymentTime] = useState(nowTime());
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasPrevious = previousOutstandingInvoices.length > 0;
  const prevTotal = Object.values(prevAmounts).reduce(
    (acc, val) => acc.plus(money(val || "0")),
    money(0)
  );
  const grandTotal = money(currentAmount || "0").plus(prevTotal);

  // --- Per-field over-payment detection & capping handlers ---
  const maxCurrent = money(remaining);
  const currentExceeds = money(currentAmount || "0").gt(maxCurrent);
  const prevExceedsMap: Record<number, boolean> = {};
  for (const inv of previousOutstandingInvoices) {
    prevExceedsMap[inv.id] = money(prevAmounts[inv.id] || "0").gt(money(inv.remaining));
  }
  const anyExceeds = currentExceeds || Object.values(prevExceedsMap).some(Boolean);

  function handleCurrentAmountChange(val: string) {
    setError(null);
    // Allow empty string or just decimal point while typing
    if (val === "" || val === ".") {
      setCurrentAmount(val);
      return;
    }
    // Check if numeric value exceeds remaining
    const num = Number(val);
    if (!isNaN(num) && money(val).gt(maxCurrent)) {
      setCurrentAmount(remaining);
      toast.warning(`Maximum balance is ${formatMoney(remaining)} — amount auto-adjusted.`);
      return;
    }
    setCurrentAmount(val);
  }

  function handlePrevAmountChange(id: number, val: string, maxRem: string) {
    setError(null);
    if (val === "" || val === ".") {
      setPrevAmounts((prev) => ({ ...prev, [id]: val }));
      return;
    }
    const num = Number(val);
    if (!isNaN(num) && money(val).gt(money(maxRem))) {
      setPrevAmounts((prev) => ({ ...prev, [id]: maxRem }));
      toast.warning(`Maximum balance is ${formatMoney(maxRem)} — amount auto-adjusted.`);
      return;
    }
    setPrevAmounts((prev) => ({ ...prev, [id]: val }));
  }

  function handleSubmit() {
    setError(null);

    // Final safety check
    if (money(currentAmount || "0").gt(maxCurrent)) {
      const msg = `Amount cannot exceed remaining balance of ${formatMoney(remaining)}.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    for (const inv of previousOutstandingInvoices) {
      if (money(prevAmounts[inv.id] || "0").gt(money(inv.remaining))) {
        const msg = `Amount for ${inv.invoiceNumber} cannot exceed remaining balance of ${formatMoney(inv.remaining)}.`;
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    const entries = [
      { invoiceId, amount: currentAmount || "0" },
      ...previousOutstandingInvoices.map((inv) => ({ invoiceId: inv.id, amount: prevAmounts[inv.id] || "0" })),
    ];

    const total = entries.reduce((acc, e) => acc.plus(money(e.amount)), money(0));
    if (total.lte(0)) {
      const msg = "Enter at least one payment amount.";
      setError(msg);
      toast.error(msg);
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
        const msg = err instanceof Error ? err.message : "Failed to record payment";
        setError(msg);
        toast.error(msg);
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

        {error ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              <strong className="block font-semibold">Payment Limit Exceeded</strong>
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <div className="space-y-4 overflow-y-auto pr-1">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label className="block text-sm">
                {hasPrevious ? "Amount for this invoice" : "Payment Amount"}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (max: {formatMoney(remaining)})
                </span>
              </Label>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setCurrentAmount(remaining)}
              >
                Full Balance
              </button>
            </div>
            <Input
              inputMode="decimal"
              value={currentAmount}
              onChange={(e) => handleCurrentAmountChange(e.target.value)}
              onBlur={() => {
                if (money(currentAmount || "0").gt(maxCurrent)) {
                  setCurrentAmount(remaining);
                }
              }}
              className={currentExceeds ? "border-destructive ring-1 ring-destructive focus-visible:ring-destructive" : ""}
            />
            {currentExceeds ? (
              <p className="mt-1 flex items-center justify-between text-xs text-destructive">
                <span>{"⚠ Exceeds remaining balance of "}{formatMoney(remaining)}</span>
                <button
                  type="button"
                  className="ml-2 font-semibold underline"
                  onClick={() => setCurrentAmount(remaining)}
                >
                  Set to Max
                </button>
              </p>
            ) : null}
          </div>

          {hasPrevious ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Select previous invoices to pay with this payment
                </p>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => {
                      const all: Record<number, string> = {};
                      for (const inv of previousOutstandingInvoices) {
                        all[inv.id] = inv.remaining;
                      }
                      setPrevAmounts(all);
                    }}
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">{"•"}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:underline"
                    onClick={() => setPrevAmounts({})}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {previousOutstandingInvoices.map((inv) => {
                const isSelected = Number(prevAmounts[inv.id] || 0) > 0;
                const exceeds = prevExceedsMap[inv.id];
                return (
                  <div key={inv.id} className="space-y-0.5 pt-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`prev-inv-${inv.id}`}
                          checked={isSelected}
                          onChange={(e) => {
                            setPrevAmounts((prev) => ({
                              ...prev,
                              [inv.id]: e.target.checked ? inv.remaining : "0",
                            }));
                          }}
                          className="size-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor={`prev-inv-${inv.id}`} className="cursor-pointer text-sm font-medium">
                          {inv.invoiceNumber}{" "}
                          <span className="text-xs font-normal text-muted-foreground">(due {formatMoney(inv.remaining)})</span>
                        </label>
                      </div>
                      <Input
                        inputMode="decimal"
                        className={`h-8 w-28 text-right${exceeds ? " border-destructive ring-1 ring-destructive" : ""}`}
                        value={prevAmounts[inv.id] ?? ""}
                        placeholder="0"
                        onChange={(e) => handlePrevAmountChange(inv.id, e.target.value, inv.remaining)}
                        onBlur={() => {
                          if (money(prevAmounts[inv.id] || "0").gt(money(inv.remaining))) {
                            setPrevAmounts((prev) => ({ ...prev, [inv.id]: inv.remaining }));
                          }
                        }}
                      />
                    </div>
                    {exceeds ? (
                      <p className="text-right text-xs text-destructive">
                        <span>{"⚠ Max: "}{formatMoney(inv.remaining)} </span>
                        <button
                          type="button"
                          className="ml-1 font-semibold underline"
                          onClick={() => setPrevAmounts((prev) => ({ ...prev, [inv.id]: inv.remaining }))}
                        >
                          Set to Max
                        </button>
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>This Invoice ({invoiceNumber || `#${invoiceId}`}):</span>
              <span className="font-medium text-foreground">{formatMoney(currentAmount || "0")}</span>
            </div>
            {hasPrevious && prevTotal.gt(0) ? (
              <div className="flex justify-between text-primary">
                <span>Selected Previous Invoices:</span>
                <span className="font-medium">+{formatMoney(prevTotal)}</span>
              </div>
            ) : null}
            <div className="mt-1 flex justify-between border-t border-border/60 pt-1 font-semibold text-foreground">
              <span>Total Payment to Record:</span>
              <span className="text-sm text-primary">{formatMoney(grandTotal)}</span>
            </div>
          </div>

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
                <SelectValue>{(value: string) => methodLabels[value] ?? value}</SelectValue>
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

        </div>

        <DialogFooter className="shrink-0 flex items-center justify-between sm:justify-between">
          {anyExceeds ? (
            <span className="text-xs font-medium text-destructive">
              ⚠ Cannot save: amount exceeds balance
            </span>
          ) : (
            <span />
          )}
          <Button type="button" disabled={isPending || anyExceeds} onClick={handleSubmit}>
            Save Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
