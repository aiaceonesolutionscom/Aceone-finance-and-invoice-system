import "./load-env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { settings } from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in."
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  await db
    .insert(settings)
    .values({
      id: 1,
      companyName: "AceOne Creative Agency",
      email: "info@aceonesolutions.com",
      phone: "+92 321 9338893",
      website: "https://aceonesolutions.com",
      address:
        "B-156, W3FW+2R9, Block 6, Gulshan-e-Iqbal, Karachi, 75300, Pakistan (offices also in Lahore, UAE, Saudi Arabia & USA)",
      companyTaxNumber: "4240107919689",
      invoicePrefix: "INV-",
      nextInvoiceNumber: 1,
      taxEnabled: false,
      taxAutoApply: true,
      taxRate: "0",
    })
    .onConflictDoNothing({ target: settings.id });

  const [row] = await db.select().from(settings).where(sql`${settings.id} = 1`);
  console.log("Settings row:", row);

  await pool.end();
}

main().catch((error) => {
  console.error("Seeding settings failed:", error);
  process.exit(1);
});
