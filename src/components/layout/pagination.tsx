import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function buildHref(basePath: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath,
  currentPage,
  totalPages,
  extraParams = {},
}: {
  basePath: string;
  currentPage: number;
  totalPages: number;
  extraParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex gap-2">
        {currentPage > 1 ? (
          <Button
            render={<Link href={buildHref(basePath, { ...extraParams, page: currentPage - 1 })} />}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
        ) : null}
        {currentPage < totalPages ? (
          <Button
            render={<Link href={buildHref(basePath, { ...extraParams, page: currentPage + 1 })} />}
            variant="outline"
            size="sm"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
