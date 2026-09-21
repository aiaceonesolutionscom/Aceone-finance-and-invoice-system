"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadLogo } from "@/actions/settings";

export function LogoUpload({ currentLogo }: { currentLogo: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("logo", file);

    startTransition(async () => {
      try {
        const publicPath = await uploadLogo(formData);
        setPreview(publicPath);
        toast.success("Logo updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to upload logo");
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
        {preview ? (
          <Image src={preview} alt="Company logo" width={80} height={80} className="size-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">No logo</span>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
          {isPending ? "Uploading..." : "Upload Logo"}
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, up to 5MB.</p>
      </div>
    </div>
  );
}
