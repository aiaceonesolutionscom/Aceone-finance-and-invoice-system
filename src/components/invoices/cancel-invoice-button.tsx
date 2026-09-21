"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelInvoice } from "@/actions/invoices";

export function CancelInvoiceButton({
  invoiceId,
  iconOnly = false,
}: {
  invoiceId: number;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          iconOnly ? (
            <Button variant="ghost" size="icon" aria-label="Cancel invoice" />
          ) : (
            <Button variant="outline" />
          )
        }
      >
        <Ban className="size-4" />
        {iconOnly ? null : "Cancel Invoice"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            The invoice stays in your records marked as CANCELLED — it will no longer
            count toward outstanding balances or previous-outstanding lookups.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await cancelInvoice(invoiceId);
                  toast.success("Invoice cancelled");
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to cancel");
                }
              })
            }
          >
            Cancel Invoice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
