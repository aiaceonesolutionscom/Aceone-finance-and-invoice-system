"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { serviceSchema, type ServiceInput } from "@/lib/validation/service";
import { createService } from "@/actions/services";

export function ServiceForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "" },
  });

  function onSubmit(values: ServiceInput) {
    startTransition(async () => {
      try {
        await createService(values);
        toast.success("Service added");
        form.reset({ name: "" });
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-w-md items-start gap-3">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="sr-only">Service Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Social Media Management" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          Add Service
        </Button>
      </form>
    </Form>
  );
}
