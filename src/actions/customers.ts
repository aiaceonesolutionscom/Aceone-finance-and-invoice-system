"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { customers, invoices } from "@/lib/db/schema";
import { customerSchema, type CustomerInput } from "@/lib/validation/customer";
import { logAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

function clean(input: CustomerInput) {
  return {
    customerName: input.customerName,
    companyName: input.companyName || null,
    email: input.email || null,
    phone: input.phone || null,
    address: input.address || null,
  };
}

export async function createCustomer(input: CustomerInput) {
  await requireAuth();
  const parsed = customerSchema.parse(input);
  const [created] = await db.insert(customers).values(clean(parsed)).returning();
  await logAudit(db, { action: "customer.created", entity: "customer", entityId: created.id, details: { customerName: created.customerName } });
  revalidatePath("/customers");
  return created;
}

export async function updateCustomer(id: number, input: CustomerInput) {
  await requireAuth();
  const parsed = customerSchema.parse(input);
  const [updated] = await db
    .update(customers)
    .set({ ...clean(parsed), updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  await logAudit(db, { action: "customer.updated", entity: "customer", entityId: id });
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return updated;
}

export async function deleteCustomer(id: number) {
  await requireAuth();

  const [customer] = await db
    .select({ name: customers.customerName })
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoices)
    .where(eq(invoices.customerId, id));

  if (count > 0) {
    throw new Error(
      `Cannot delete "${customer?.name ?? "this customer"}" because ${count} invoice(s) are attached to them. Please delete or reassign all their invoices first before deleting this customer.`
    );
  }

  try {
    await db.delete(customers).where(eq(customers.id, id));
  } catch (error) {
    if (
      error instanceof Error &&
      (/foreign key/i.test(error.message) ||
        /violates foreign key/i.test(String((error as any).cause?.message)))
    ) {
      throw new Error(
        `Cannot delete "${customer?.name ?? "this customer"}" because existing invoices are still linked to them. Please delete their invoices first.`
      );
    }
    throw error;
  }

  await logAudit(db, {
    action: "customer.deleted",
    entity: "customer",
    entityId: id,
    details: { name: customer?.name },
  });
  revalidatePath("/customers");
}

