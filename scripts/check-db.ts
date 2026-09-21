import "./load-env";
import { Client } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      "DATABASE_URL is not set.\n" +
        "Copy .env.example to .env.local and fill in your connection string."
    );
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    await client.query("SELECT 1");
    const { host, port, database } = client as unknown as {
      host: string;
      port: number;
      database: string;
    };
    console.log(`Database reachable at ${host}:${port}/${database}`);
    process.exit(0);
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { code?: string };
    if (err.code === "ECONNREFUSED") {
      console.error(
        "Connection refused. Is PostgreSQL running?\n" +
          "On Windows, check the postgresql-x64-* service in services.msc."
      );
    } else if (err.code === "28P01") {
      console.error(
        "Password authentication failed. Check the password in DATABASE_URL."
      );
    } else if (err.code === "3D000") {
      console.error(
        "Database does not exist. Did you run the createdb command from README.md?"
      );
    } else {
      console.error("Could not reach the database:", err.message);
    }
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
