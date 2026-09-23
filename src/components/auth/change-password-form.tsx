"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
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
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/auth";
import { changePassword } from "@/actions/auth";

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  function onSubmit(values: ChangePasswordInput) {
    startTransition(async () => {
      try {
        await changePassword(values);
        toast.success("Password updated");
        form.reset();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update password");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-sm space-y-5">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <div className="relative flex items-center">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    autoComplete="current-password"
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    className="absolute right-2.5 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                    aria-label={showCurrent ? "Hide current password" : "Show current password"}
                  >
                    {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <div className="relative flex items-center">
                  <Input
                    type={showNew ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((prev) => !prev)}
                    className="absolute right-2.5 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                    aria-label={showNew ? "Hide new password" : "Show new password"}
                  >
                    {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <div className="relative flex items-center">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-2.5 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          Update Password
        </Button>
      </form>
    </Form>
  );
}
