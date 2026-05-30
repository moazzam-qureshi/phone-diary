// Standalone migration runner — entrypoint for the Docker `migrate` service
// and for local `npm run db:migrate`. Uses the programmatic migrator so the
// container needs only drizzle-orm + pg (no drizzle-kit / config resolution).
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });

  try {
    const db = drizzle(pool);
    console.log("[migrate] applying migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("[migrate] done.");
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate] failed:", err);
    process.exit(1);
  });
