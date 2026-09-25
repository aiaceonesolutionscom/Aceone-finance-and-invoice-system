"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
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
  try {
    await db.delete(customers).where(eq(customers.id, id));
  } catch (error) {
    if (error instanceof Error && /foreign key/i.test(error.message)) {
      throw new Error(
        "Cannot delete a customer that has existing invoices."
      );
    }
    throw error;
  }
  await logAudit(db, { action: "customer.deleted", entity: "customer", entityId: id });
  revalidatePath("/customers");
}

