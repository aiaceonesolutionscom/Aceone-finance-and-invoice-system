function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getPresetRange(preset: string): { from: string; to: string } | null {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  if (preset === "this-month") {
    return { from: fmt(new Date(Date.UTC(year, month, 1))), to: fmt(new Date(Date.UTC(year, month + 1, 0))) };
  }
  if (preset === "last-month") {
    return { from: fmt(new Date(Date.UTC(year, month - 1, 1))), to: fmt(new Date(Date.UTC(year, month, 0))) };
  }
  if (preset === "this-year") {
    return { from: fmt(new Date(Date.UTC(year, 0, 1))), to: fmt(new Date(Date.UTC(year, 11, 31))) };
  }
  return null;
}
