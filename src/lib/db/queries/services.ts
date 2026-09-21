import { desc, ilike, sql } from "drizzle-orm";
import { db, type Tx } from "@/lib/db";
import { services } from "@/lib/db/schema";

export async function listServices(search?: string) {
  const term = search?.trim();
  return db
    .select()
    .from(services)
    .where(term ? ilike(services.name, `%${term}%`) : undefined)
    .orderBy(desc(services.createdAt));
}

// Paginated variant for the Services list page — listServices() itself stays
// unpaginated because the invoice form's service combobox needs every
// service at once for client-side search/create.
export async function listServicesPaginated(search?: string, pagination?: { limit: number; offset: number }) {
  const term = search?.trim();

  const rows = await db
    .select({
      id: services.id,
      name: services.name,
      createdAt: services.createdAt,
      updatedAt: services.updatedAt,
      totalCount: sql<string>`count(*) over()`,
    })
    .from(services)
    .where(term ? ilike(services.name, `%${term}%`) : undefined)
    .orderBy(desc(services.createdAt))
    .limit(pagination?.limit ?? 1000000)
    .offset(pagination?.offset ?? 0);

  const total = rows.length > 0 ? Number(rows[0].totalCount) : 0;
  return {
    rows: rows.map((row) => ({ id: row.id, name: row.name, createdAt: row.createdAt, updatedAt: row.updatedAt })),
    total,
  };
}

/**
 * Upserts a service by case-insensitive name. Used both by the standalone
 * "create service" action and, inside the invoice transaction, whenever an
 * invoice line uses a custom (not-yet-catalogued) service name. Only the
 * name is ever synced — a rate typed on an invoice line never becomes a
 * service default.
 */
export async function upsertServiceByName(
  executor: Tx | typeof db,
  rawName: string
): Promise<{ id: number; name: string }> {
  const name = rawName.trim();

  const inserted = await executor.execute<{ id: number; name: string }>(sql`
    INSERT INTO services (name)
    VALUES (${name})
    ON CONFLICT (lower(name)) DO NOTHING
    RETURNING id, name
  `);

  if (inserted.rows[0]) {
    return inserted.rows[0];
  }

  const existing = await executor.execute<{ id: number; name: string }>(sql`
    SELECT id, name FROM services WHERE lower(name) = lower(${name}) LIMIT 1
  `);

  const row = existing.rows[0];
  if (!row) {
    throw new Error(`Failed to upsert service "${name}"`);
  }
  return row;
}
