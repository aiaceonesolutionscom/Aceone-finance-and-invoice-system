import { config } from "dotenv";

// Next.js auto-loads .env.local for the app itself, but standalone scripts
// (migrate, seed, check-db) run outside Next.js and need this explicitly.
config({ path: ".env.local" });
config();
