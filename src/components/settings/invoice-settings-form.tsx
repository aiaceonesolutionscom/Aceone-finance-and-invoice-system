"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { invoiceSettingsSchema, type InvoiceSettingsInput } from "@/lib/validation/settings";
import { updateInvoiceSettings } from "@/actions/settings";

export function InvoiceSettingsForm({ defaultValues }: { defaultValues: InvoiceSettingsInput }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<InvoiceSettingsInput>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues,
  });

  const taxEnabled = form.watch("taxEnabled");

  function onSubmit(values: InvoiceSettingsInput) {
    startTransition(async () => {
      try {
        await updateInvoiceSettings(values);
        toast.success("Invoice settings updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="invoicePrefix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Prefix</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nextInvoiceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Invoice Number</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="defaultPaymentTerms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Payment Terms</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="e.g. Payment due within 15 days" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Switch
              id="tax-enabled"
              checked={taxEnabled}
              onCheckedChange={(checked) => form.setValue("taxEnabled", checked)}
            />
            <Label htmlFor="tax-enabled">Additional Tax Enabled</Label>
          </div>

          {taxEnabled ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="taxName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. GST" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" placeholder="e.g. 18" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="tax-auto-apply"
                  checked={form.watch("taxAutoApply")}
                  onCheckedChange={(checked) => form.setValue("taxAutoApply", checked)}
                />
                <Label htmlFor="tax-auto-apply">Apply automatically to new invoices</Label>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="show-previous-outstanding"
            checked={form.watch("showPreviousOutstandingOnInvoice")}
            onCheckedChange={(checked) => form.setValue("showPreviousOutstandingOnInvoice", checked)}
          />
          <Label htmlFor="show-previous-outstanding">Show Previous Outstanding on generated invoice PDF</Label>
        </div>

        <FormField
          control={form.control}
          name="footerText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Footer Text</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="e.g. Thank you for your business!" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          Save Invoice Settings
        </Button>
      </form>
    </Form>
  );
}
