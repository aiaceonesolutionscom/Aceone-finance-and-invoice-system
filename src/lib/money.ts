import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = string | number | Decimal | null | undefined;

/** Parse any raw value (a numeric-column string, a form field, etc.) into a Decimal. */
export function money(value: MoneyInput): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  return new Decimal(value);
}

export function sumMoney(values: MoneyInput[]): Decimal {
  return values.reduce((acc: Decimal, v) => acc.plus(money(v)), new Decimal(0));
}

/** Format for display, e.g. "PKR 40,000.00". */
export function formatMoney(value: MoneyInput, currency = "PKR"): string {
  const amount = money(value).toFixed(2);
  const [whole, fraction] = amount.split(".");
  const negative = whole.startsWith("-");
  const digits = negative ? whole.slice(1) : whole;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency} ${negative ? "-" : ""}${grouped}.${fraction}`;
}

/** What gets written into a numeric() column via Drizzle. */
export function toDbString(value: Decimal | MoneyInput): string {
  return money(value).toFixed(2);
}
