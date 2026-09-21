"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { createInvoiceText, updateInvoiceText, deleteInvoiceText } from "@/actions/settings";

type InvoiceText = {
  id: number;
  title: string;
  content: string;
  enabled: boolean;
  sortOrder: number;
};

function TextFormDialog({
  text,
  trigger,
}: {
  text?: InvoiceText;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(text?.title ?? "");
  const [content, setContent] = useState(text?.content ?? "");
  const [enabled, setEnabled] = useState(text?.enabled ?? true);
  const [sortOrder, setSortOrder] = useState(text?.sortOrder ?? 0);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{text ? "Edit Text" : "Add Additional Text"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Payment Terms" />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Sort Order</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} id="text-enabled" />
            <Label htmlFor="text-enabled">Show on Invoice</Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={isPending || !title.trim() || !content.trim()}
            onClick={() =>
              startTransition(async () => {
                try {
                  const input = { title, content, enabled, sortOrder };
                  if (text) {
                    await updateInvoiceText(text.id, input);
                    toast.success("Text updated");
                  } else {
                    await createInvoiceText(input);
                    toast.success("Text added");
                  }
                  setOpen(false);
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to save");
                }
              })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTextButton({ id }: { id: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label="Delete text" />}>
        <Trash2 className="size-4 text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this text?</AlertDialogTitle>
          <AlertDialogDescription>This will no longer appear on future invoices.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await deleteInvoiceText(id);
                  toast.success("Text deleted");
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete");
                }
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function InvoiceTextsManager({ texts }: { texts: InvoiceText[] }) {
  return (
    <div className="max-w-lg space-y-3">
      <TextFormDialog trigger={<Button variant="outline" size="sm"><Plus className="size-4" />Add Additional Text</Button>} />

      {texts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No additional invoice texts yet.</p>
      ) : (
        texts.map((text) => (
          <Card key={text.id}>
            <CardContent className="flex items-start justify-between gap-3 pt-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {text.title} {text.enabled ? null : <span className="text-xs text-muted-foreground">(hidden)</span>}
                </p>
                <p className="truncate text-sm text-muted-foreground">{text.content}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <TextFormDialog
                  text={text}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Edit ${text.title}`}>
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
                <DeleteTextButton id={text.id} />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
