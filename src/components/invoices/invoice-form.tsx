"use client";

import { useState, useTransition } from "react";
import { useRouter, unstable_rethrow } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CustomerCombobox, type CustomerOption } from "@/components/invoices/customer-combobox";
import { ServiceCombobox, type ServiceOption } from "@/components/invoices/service-combobox";
import { PreviousOutstandingPanel } from "@/components/invoices/previous-outstanding-panel";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation/invoice";
import { createInvoice, updateInvoice } from "@/actions/invoices";
import { money, formatMoney } from "@/lib/money";

export type TaxInfo = {
  enabled: boolean;
  autoApply: boolean;
  name: string | null;
  rate: string | null;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyLine = { serviceId: null, customName: null, rate: "" };

export function InvoiceForm({
  customers,
  services,
  taxInfo,
  mode = "create",
  invoiceId,
  defaultValues,
}: {
  customers: CustomerOption[];
  services: ServiceOption[];
  taxInfo: TaxInfo;
  mode?: "create" | "edit";
  invoiceId?: number;
  defaultValues?: InvoiceInput;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: defaultValues ?? {
      customerId: 0,
      invoiceDate: todayIso(),
      discount: "0",
      lines: [emptyLine],
      includePreviousOutstanding: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const [previousOutstandingAmount, setPreviousOutstandingAmount] = useState("0");

  const customerId = form.watch("customerId");
  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;
  const lines = form.watch("lines");
  const discount = form.watch("discount");
  const includePreviousOutstanding = form.watch("includePreviousOutstanding");

  const subtotal = lines.reduce((acc, line) => acc.plus(money(line.rate || "0")), money(0));
  const discountAmount = money(discount || "0");
  const taxApplies = taxInfo.enabled && taxInfo.autoApply;
  const taxAmount = taxApplies
    ? subtotal.minus(discountAmount).times(money(taxInfo.rate)).dividedBy(100)
    : money(0);
  const currentInvoiceTotal = subtotal.minus(discountAmount).plus(taxAmount);
  const totalAmountDue = includePreviousOutstanding
    ? currentInvoiceTotal.plus(money(previousOutstandingAmount))
    : currentInvoiceTotal;

  function submit(values: InvoiceInput, openPaymentAfter: boolean) {
    startTransition(async () => {
      try {
        if (mode === "edit" && invoiceId) {
          await updateInvoice(invoiceId, values);
        } else {
          await createInvoice(values, { openPaymentAfter });
        }
      } catch (error) {
        unstable_rethrow(error);
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={() => (
                <FormItem>
                  <FormLabel>Customer / Company</FormLabel>
                  <FormControl>
                    <CustomerCombobox
                      customers={customers}
                      value={customerId || null}
                      onChange={(customer) =>
                        form.setValue("customerId", customer?.id ?? 0, { shouldValidate: true })
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCustomer ? (
              <div className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Name: </span>
                  {selectedCustomer.customerName}
                </div>
                <div>
                  <span className="text-muted-foreground">Company: </span>
                  {selectedCustomer.companyName ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  {selectedCustomer.email ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Phone: </span>
                  {selectedCustomer.phone ?? "—"}
                </div>
              </div>
            ) : null}

            <PreviousOutstandingPanel
              customerId={customerId || null}
              excludeInvoiceId={invoiceId}
              onAmountChange={setPreviousOutstandingAmount}
            />

            {money(previousOutstandingAmount).gt(0) ? (
              <div className="flex items-center gap-2">
                <Switch
                  id="include-previous-outstanding"
                  checked={includePreviousOutstanding}
                  onCheckedChange={(checked) => form.setValue("includePreviousOutstanding", checked)}
                />
                <Label htmlFor="include-previous-outstanding" className="text-sm font-normal">
                  Include Previous Outstanding in Total Amount Due
                </Label>
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="invoiceDate"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Invoice Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <ServiceCombobox
                    services={services}
                    serviceId={form.watch(`lines.${index}.serviceId`)}
                    customName={form.watch(`lines.${index}.customName`)}
                    onSelectExisting={(service) => {
                      form.setValue(`lines.${index}.serviceId`, service.id);
                      form.setValue(`lines.${index}.customName`, null);
                      form.clearErrors(`lines.${index}.customName`);
                    }}
                    onSelectCustom={(name) => {
                      form.setValue(`lines.${index}.serviceId`, null);
                      form.setValue(`lines.${index}.customName`, name, { shouldValidate: true });
                    }}
                  />
                  {form.formState.errors.lines?.[index]?.customName ? (
                    <p className="mt-1 text-sm text-destructive">
                      {form.formState.errors.lines[index]?.customName?.message}
                    </p>
                  ) : null}
                </div>
                <div className="w-40">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.rate`}
                    render={({ field: rateField }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Rate" inputMode="decimal" {...rateField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Duplicate"
                  onClick={() => append({ ...lines[index] })}
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(emptyLine)}
            >
              <Plus className="size-4" />
              Add Item
            </Button>
            {form.formState.errors.lines?.root || typeof form.formState.errors.lines?.message === "string" ? (
              <p className="text-sm text-destructive">{form.formState.errors.lines?.message as string}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Discount</span>
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem className="w-40">
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {taxApplies ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {taxInfo.name ?? "Tax"} ({taxInfo.rate}%)
                </span>
                <span>{formatMoney(taxAmount)}</span>
              </div>
            ) : null}
            <Separator />
            <div className="flex items-center justify-between font-medium">
              <span>Current Invoice Total</span>
              <span>{formatMoney(currentInvoiceTotal)}</span>
            </div>
            {money(previousOutstandingAmount).gt(0) ? (
              <>
                <div className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-400">
                  <span>Previous Outstanding {includePreviousOutstanding ? "" : "(not included)"}</span>
                  <span>{formatMoney(previousOutstandingAmount)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total Amount Due</span>
                  <span>{formatMoney(totalAmountDue)}</span>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            disabled={isPending}
            onClick={form.handleSubmit((values) => submit(values, false))}
          >
            Save Invoice
          </Button>
          {mode === "create" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={form.handleSubmit((values) => submit(values, true))}
            >
              Save &amp; Add Payment
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
