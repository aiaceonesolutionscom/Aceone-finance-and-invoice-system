import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js auto-loads .env.local for the app itself, but standalone scripts
// (drizzle-kit, migrate, seed) run outside Next.js and need this explicitly.
config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in."
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
  verbose: true,
});
