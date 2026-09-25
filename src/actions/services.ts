"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { upsertServiceByName } from "@/lib/db/queries/services";
import { serviceSchema, type ServiceInput } from "@/lib/validation/service";
import { logAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export async function createService(input: ServiceInput) {
  await requireAuth();
  const parsed = serviceSchema.parse(input);
  const service = await upsertServiceByName(db, parsed.name);
  await logAudit(db, { action: "service.created", entity: "service", entityId: service.id, details: { name: service.name } });
  revalidatePath("/services");
  return service;
}

export async function updateService(id: number, input: ServiceInput) {
  await requireAuth();
  const parsed = serviceSchema.parse(input);
  const [updated] = await db
    .update(services)
    .set({ name: parsed.name, updatedAt: new Date() })
    .where(eq(services.id, id))
    .returning();
  await logAudit(db, { action: "service.updated", entity: "service", entityId: id });
  revalidatePath("/services");
  return updated;
}

export async function deleteService(id: number) {
  await requireAuth();
  await db.delete(services).where(eq(services.id, id));
  await logAudit(db, { action: "service.deleted", entity: "service", entityId: id });
  revalidatePath("/services");
}

