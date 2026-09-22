import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { CompanySnapshot, CustomerSnapshot, InvoiceTextSnapshot } from "./snapshot-types";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const money = (name: string) => numeric(name, { precision: 14, scale: 2 });

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "SENT",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "JAZZCASH",
  "EASYPAISA",
  "OTHER",
]);

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  companyName: text("company_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  ...timestamps,
});

export const services = pgTable(
  "services",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("services_name_lower_idx").on(sql`lower(${table.name})`),
  ]
);

// Singleton config row — always id = 1. Read via getSettings(), never
// queried by any other id.
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  companyName: text("company_name"),
  logo: text("logo"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  companyTaxNumber: text("company_tax_number"),
  bankDetails: text("bank_details"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV-"),
  nextInvoiceNumber: integer("next_invoice_number").notNull().default(1),
  defaultPaymentTerms: text("default_payment_terms"),
  taxEnabled: boolean("tax_enabled").notNull().default(false),
  taxName: text("tax_name"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  // Not in the original spec's field list (section 55) — added because
  // section 22/23 require an "apply automatically to new invoices" toggle
  // for the tax feature, which has nowhere else to live.
  taxAutoApply: boolean("tax_auto_apply").notNull().default(true),
  footerText: text("footer_text"),
  showPreviousOutstandingOnInvoice: boolean("show_previous_outstanding_on_invoice")
    .notNull()
    .default(true),
  ...timestamps,
});

export const invoiceTexts = pgTable("invoice_texts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  invoiceDate: date("invoice_date").notNull(),
  subtotal: money("subtotal").notNull(),
  discount: money("discount").notNull().default("0"),
  taxNameSnapshot: text("tax_name_snapshot"),
  taxRateSnapshot: numeric("tax_rate_snapshot", { precision: 5, scale: 2 }),
  taxAmount: money("tax_amount").notNull().default("0"),
  currentInvoiceTotal: money("current_invoice_total").notNull(),
  previousOutstandingAmount: money("previous_outstanding_amount")
    .notNull()
    .default("0"),
  totalAmountDue: money("total_amount_due").notNull(),
  status: invoiceStatusEnum("status").notNull().default("UNPAID"),
  // Frozen at creation time so later edits to Settings/Customers never
  // retroactively change a historical invoice.
  companySnapshot: jsonb("company_snapshot").$type<CompanySnapshot>().notNull(),
  customerSnapshot: jsonb("customer_snapshot").$type<CustomerSnapshot>().notNull(),
  paymentTermsSnapshot: text("payment_terms_snapshot"),
  footerSnapshot: text("footer_snapshot"),
  additionalTextSnapshot: jsonb("additional_text_snapshot").$type<InvoiceTextSnapshot[]>(),
  ...timestamps,
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").references(() => services.id, {
    onDelete: "set null",
  }),
  // Frozen at save time — renaming/deleting a service never changes what an
  // old invoice displays.
  serviceNameSnapshot: text("service_name_snapshot").notNull(),
  rate: money("rate").notNull(),
  discount: money("discount").notNull().default("0"),
  tax: money("tax").notNull().default("0"),
  total: money("total").notNull(),
  ...timestamps,
});

// Single-user auth. Only ever one row (id = 1) — this app has exactly one
// operator account for now. If multi-user/roles are needed later, this
// becomes the seed row of a real users table instead of a special case.
export const appUser = pgTable("app_user", {
  id: integer("id").primaryKey().default(1),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  ...timestamps,
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "restrict" }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  amount: money("amount").notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentTime: time("payment_time"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  // Set only when one "Record Payment" action split money across several
  // invoices at once (current + previous-outstanding) — lets each invoice
  // show "this payment was recorded together with invoice X".
  batchId: text("batch_id"),
  // Nullable free-text until auth lands; wire to the authenticated user's
  // id/name then without a schema change.
  createdBy: text("created_by"),
  ...timestamps,
});

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("expense_categories_name_lower_idx").on(sql`lower(${table.name})`),
  ]
);

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  expenseName: text("expense_name").notNull(),
  amount: money("amount").notNull(),
  expenseDate: date("expense_date").notNull(),
  expenseTime: time("expense_time"),
  categoryId: integer("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  createdBy: text("created_by"),
  ...timestamps,
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actor: text("actor"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
