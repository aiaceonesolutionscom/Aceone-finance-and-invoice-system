# Database Setup

This project uses PostgreSQL in both environments:

- **Development:** a local PostgreSQL instance on your machine.
- **Production:** PostgreSQL provided by the SHADOW/cPanel host (set up later —
  not covered here yet).

The application never hard-codes a host, port, or credentials — everything
comes from the `DATABASE_URL` environment variable, so moving between
environments is a configuration change, not a code change.

## 1. Confirm PostgreSQL is installed and running

**Windows:** check for a `postgresql-x64-<version>` service:

```powershell
Get-Service -Name "*postgres*"
```

It should show `Running`. If PostgreSQL isn't installed, install it from
[postgresql.org](https://www.postgresql.org/download/) — do not install a
second database engine if PostgreSQL is already present.

Confirm the version and that it accepts connections on port 5432:

```powershell
& "C:\Program Files\PostgreSQL\<version>\bin\pg_isready.exe" -p 5432
```

## 2. Create a dedicated role and database for this project

Don't reuse the `postgres` superuser for the application. Run these as the
`postgres` superuser (you'll be prompted for its password, then asked to set
a new password for the new role — never pass passwords as command-line
arguments):

```bash
createuser -U postgres -P aceone_dev
createdb   -U postgres -O aceone_dev aceone_finance_dev
```

- `aceone_dev` — a low-privilege role owned only by this project's database.
- `aceone_finance_dev` — the database itself, owned by that role.

If you'd rather use `psql` directly:

```sql
CREATE ROLE aceone_dev WITH LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE aceone_finance_dev OWNER aceone_dev;
GRANT ALL PRIVILEGES ON DATABASE aceone_finance_dev TO aceone_dev;
```

## 3. Configure `DATABASE_URL`

Copy `.env.example` to `.env.local` and fill in the connection string using
the role/password/database from step 2:

```
DATABASE_URL=postgresql://aceone_dev:your-password@localhost:5432/aceone_finance_dev
```

## 4. Verify connectivity

```bash
npm run check-db
```

This prints a friendly, specific error if something's wrong instead of a raw
stack trace:

- `ECONNREFUSED` → PostgreSQL isn't running.
- `28P01` (password authentication failed) → wrong password in `DATABASE_URL`.
- `3D000` (database does not exist) → step 2 wasn't run, or the database name
  doesn't match.

## 5. Run migrations and seed initial data

```bash
npm run db:migrate       # applies every migration in db/migrations/
npm run seed-settings    # creates the singleton settings row (id = 1)
npm run seed-user        # creates the one operator login — prints email + password
```

All three are safe to re-run — migrations are idempotent, and the seed
scripts detect existing rows and skip re-creating them.

## Schema changes going forward

1. Edit `src/lib/db/schema.ts`.
2. `npm run db:generate` — writes a new timestamped SQL file into
   `db/migrations/` (review it, then commit it to git).
3. `npm run db:migrate` — applies it to whatever `DATABASE_URL` currently
   points at.

The same two commands (`db:generate` locally once, `db:migrate` against
each environment) are how schema changes reach the SHADOW/cPanel database
later — no manual SQL required there either.

## Troubleshooting

- **`no pg_hba.conf entry for host ...`** — PostgreSQL's
  `pg_hba.conf` needs a `host` line allowing `scram-sha-256` (or `md5`) for
  `127.0.0.1/32` and `::1/128`. This is PostgreSQL's default on a fresh
  install; only relevant if it's been customized.
- **`relation "..." does not exist`** — migrations haven't been applied yet;
  run `npm run db:migrate`.
- **App throws "Settings row is missing"** — run `npm run seed-settings`.
- **Can't log in / "No account has been set up yet"** — run
  `npm run seed-user`.

## Backup considerations (development)

`pg_dump`/`pg_restore` work normally against `aceone_finance_dev` like any
other PostgreSQL database:

```bash
pg_dump -U aceone_dev -h localhost aceone_finance_dev > backup.sql
```

Production backup strategy depends on what SHADOW/cPanel provides
(scheduled `pg_dump` via cron, cPanel's own backup tooling, etc.) — to be
decided when that environment is actually configured.
