# AceOne Creative Agency — Finance System

Internal invoicing, payments, expenses and reporting system for a service-based
business (digital marketing, design, development, AI/automation). Built as a
plain Node.js Next.js application — no Vercel-specific features — so it can
run in development against a local PostgreSQL instance and later move to a
cPanel-hosted PostgreSQL database by changing only environment variables.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- PostgreSQL via Drizzle ORM (`pg` driver — no native binaries, cPanel-friendly)
- Zod for validation, react-hook-form for forms
- decimal.js for all money arithmetic (never floats)
- @react-pdf/renderer for invoice PDFs
- bcryptjs for password hashing (pure JS, no native compile step)

## Project structure

```
src/
  app/
    login/                # public login page
    (app)/                 # everything behind the session check
      dashboard/ customers/ services/ invoices/ payments/
      expenses/ reports/ settings/ account/
  actions/                 # 'use server' mutations
  lib/
    db/                    # drizzle client, schema, query helpers
    validation/            # zod schemas
    money.ts               # decimal.js wrapper — the only place money math happens
    invoice-status.ts       # single source of truth for invoice status
    auth.ts                 # session cookie + password hashing
  components/
db/migrations/              # drizzle-kit generated SQL, committed to git
scripts/                    # check-db, migrate, seed-settings, seed-user
```

## Local development setup

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for creating the local PostgreSQL
role/database. Once `.env.local` has a working `DATABASE_URL`:

```bash
npm install
npm run check-db        # confirms the database is reachable
npm run db:migrate       # applies all migrations in db/migrations/
npm run seed-settings    # creates the singleton settings row
npm run seed-user        # creates the one operator account (prints credentials)
npm run dev              # starts the dev server on http://localhost:3005
```

Sign in at `/login` with the email/password printed by `seed-user`, then
change the password from the sidebar's "Change Password" link.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Local Postgres in dev, SHADOW/cPanel Postgres in production — same code, different value. |
| `PORT` | Port the server listens on. Currently pinned to `3005` in `package.json`'s `dev`/`start` scripts for local convenience; change those scripts (or pass `-p`) for a different port. |
| `NODE_ENV` | `development` or `production`. Controls cookie `secure` flag among other things. |

Never commit `.env.local` — only `.env.example` is tracked.

## Database workflow

Schema lives in `src/lib/db/schema.ts`. After changing it:

```bash
npm run db:generate   # writes a new SQL migration to db/migrations/
npm run db:migrate    # applies pending migrations against DATABASE_URL
```

The exact same two commands apply migrations to the production (SHADOW)
database later — only `DATABASE_URL` changes.

`npm run db:studio` opens Drizzle Studio for browsing/editing data directly —
useful before the Settings UI existed and still handy for one-off fixes.

## Production build

```bash
npm run build
npm run start
```

`next start` respects `process.env.PORT` if the `-p 3005` flag in
`package.json` is removed; keep this in mind when preparing for cPanel
deployment (not covered yet — see project notes).

## Single-user authentication

This app currently supports exactly one operator account (see
`src/lib/db/schema.ts`'s `app_user` table — a singleton row, `id = 1`).
Login/logout/change-password are implemented; multi-user roles are not built
yet but the schema and session model don't need to change to add them later
(`payments.created_by` etc. already reference the operator by email).

## What's implemented

Customers, Services, Invoices (with previous-outstanding tracking, custom
services, tax, discount), Payments (multi-payment, validated against
remaining balance), Expenses (name + amount, no categories), Dashboard,
Reports (Business Overview, Outstanding/Receivables, Customer Revenue,
Invoice Report, Payment Report, Expense Analysis, Profit/Loss, Customer
Statement), Settings (company info, logo upload, invoice numbering, tax
configuration, additional invoice texts), and PDF generation.

Audit log **writing** is wired into every mutating action
(`src/lib/audit.ts` + the `audit_logs` table) even though there's no viewer
UI yet — the data is being captured for whenever that's built.
