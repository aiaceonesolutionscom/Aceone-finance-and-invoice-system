"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { money, formatMoney } from "@/lib/money";

type Slice = { name: string; value: number; color: string };

function Donut({ data, centerLabel }: { data: Slice[]; centerLabel: string }) {
  const total = data.reduce((sum, s) => sum + s.value, 0);

  if (total <= 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No data yet.
      </div>
    );
  }

  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="90%" paddingAngle={2}>
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatMoney(money(Array.isArray(value) ? value[0] : (value ?? 0)))}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
}

function Legend({ data }: { data: Slice[] }) {
  const total = data.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="mt-3 space-y-1.5">
      {data.map((slice) => (
        <div key={slice.name} className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
            {slice.name}
          </span>
          <span className="text-muted-foreground">
            {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function InvoiceStatusDonut({
  unpaidCount,
  partialCount,
  paidCount,
}: {
  unpaidCount: number;
  partialCount: number;
  paidCount: number;
}) {
  const data: Slice[] = [
    { name: "Unpaid", value: unpaidCount, color: "#f59e0b" },
    { name: "Partially Paid", value: partialCount, color: "#0ea5e9" },
    { name: "Paid", value: paidCount, color: "#10b981" },
  ];
  return (
    <div>
      <Donut data={data} centerLabel={`${unpaidCount + partialCount + paidCount} invoices`} />
      <Legend data={data} />
    </div>
  );
}

export function ReceivedVsOutstandingDonut({
  totalReceived,
  totalOutstanding,
}: {
  totalReceived: string;
  totalOutstanding: string;
}) {
  const data: Slice[] = [
    { name: "Received", value: money(totalReceived).toNumber(), color: "#10b981" },
    { name: "Outstanding", value: money(totalOutstanding).toNumber(), color: "#f59e0b" },
  ];
  const total = money(totalReceived).plus(money(totalOutstanding));
  return (
    <div>
      <Donut data={data} centerLabel={formatMoney(total)} />
      <Legend data={data} />
    </div>
  );
}
