import "./load-env";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { appUser } from "../src/lib/db/schema";

function generatePassword(): string {
  return randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const [existing] = await db.select().from(appUser).where(sql`${appUser.id} = 1`);
  if (existing) {
    console.log(`An account already exists: ${existing.email}`);
    console.log("Use the in-app 'Change Password' page to update it, or delete the app_user row to reseed.");
    await pool.end();
    return;
  }

  const email = process.argv[2] ?? "admin@aceonesolutions.com";
  const password = process.argv[3] ?? generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(appUser).values({ id: 1, email, passwordHash });

  console.log("Account created:");
  console.log("  Email:   ", email);
  console.log("  Password:", password);
  console.log("Sign in at /login, then change this password from the Account page.");

  await pool.end();
}

main().catch((error) => {
  console.error("Seeding user failed:", error);
  process.exit(1);
});
