"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ fallbackHref }: { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mb-2 -ml-2"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else if (fallbackHref) {
          router.push(fallbackHref);
        }
      }}
    >
      <ArrowLeft className="size-4" />
      Back
    </Button>
  );
}
