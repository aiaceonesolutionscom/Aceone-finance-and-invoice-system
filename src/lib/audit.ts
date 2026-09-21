import { db, type Tx } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function logAudit(
  executor: Tx | typeof db,
  input: {
    action: string;
    entity: string;
    entityId?: number | null;
    details?: Record<string, unknown>;
  }
) {
  const user = await getSessionUser().catch(() => null);
  await executor.insert(auditLogs).values({
    actor: user?.email ?? null,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    details: input.details ?? null,
  });
}
