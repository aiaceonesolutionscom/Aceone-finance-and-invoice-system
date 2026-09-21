"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { previewPreviousOutstanding } from "@/actions/invoices";
import { formatMoney } from "@/lib/money";

type PreviousOutstanding = Awaited<ReturnType<typeof previewPreviousOutstanding>>;

export function PreviousOutstandingPanel({
  customerId,
  excludeInvoiceId,
  onAmountChange,
}: {
  customerId: number | null;
  excludeInvoiceId?: number;
  onAmountChange?: (amount: string) => void;
}) {
  const [data, setData] = useState<PreviousOutstanding | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) {
      onAmountChange?.("0");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-prop-change loading flag
    setLoading(true);
    previewPreviousOutstanding(customerId, excludeInvoiceId)
      .then((result) => {
        setData(result);
        onAmountChange?.(result.previousOutstandingAmount);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onAmountChange is a stable callback identity from the parent, not a reactive dependency
  }, [customerId, excludeInvoiceId]);

  if (!customerId) return null;
  if (loading) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-muted-foreground dark:border-amber-900 dark:bg-amber-950/30">
        Checking previous balance...
      </div>
    );
  }
  if (!data || Number(data.previousOutstandingAmount) <= 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Previous Outstanding: {formatMoney(0)}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Previous Outstanding (from earlier invoices)</span>
        <span className="text-lg font-semibold text-amber-800 dark:text-amber-300">
          {formatMoney(data.previousOutstandingAmount)}
        </span>
      </div>
      <ul className="space-y-1 text-sm">
        {data.invoices.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between text-muted-foreground">
            <Link href={`/invoices/${inv.id}`} className="underline-offset-2 hover:underline" target="_blank">
              {inv.invoiceNumber}
            </Link>
            <span>
              Total {formatMoney(inv.total)} · Paid {formatMoney(inv.paid)} · Remaining{" "}
              <span className="font-medium text-foreground">{formatMoney(inv.remaining)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
