import { PageHeader } from "@/components/layout/header";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        {title} is coming in a later phase.
      </div>
    </div>
  );
}
