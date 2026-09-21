import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePresetSelect } from "@/components/layout/date-preset-select";

export function DateRangeFilter({
  basePath,
  dateFrom,
  dateTo,
  preset,
  extraParams = {},
}: {
  basePath: string;
  dateFrom?: string;
  dateTo?: string;
  preset?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-4">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Quick Range</label>
        <DatePresetSelect basePath={basePath} currentPreset={preset} extraParams={extraParams} />
      </div>
      <form action={basePath} method="GET" className="flex items-end gap-2">
        {Object.entries(extraParams).map(([name, value]) =>
          value ? <input key={name} type="hidden" name={name} value={value} /> : null
        )}
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">From</label>
          <Input type="date" name="from" defaultValue={dateFrom} className="h-8 w-36" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To</label>
          <Input type="date" name="to" defaultValue={dateTo} className="h-8 w-36" />
        </div>
        <Button type="submit" size="sm" variant="outline">
          Apply
        </Button>
      </form>
    </div>
  );
}
