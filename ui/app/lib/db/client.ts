import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/app/lib/env";
import * as schema from "./schema";

// Lazily create the pool + drizzle instance on FIRST USE (request time), not at
// module load. This keeps `next build` from needing DATABASE_URL when it
// collects the route module graph. Cached on globalThis so dev HMR reuses one
// pool.
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __alsPool?: Pool;
  __alsDb?: DrizzleDb;
};

function getDb(): DrizzleDb {
  if (globalForDb.__alsDb) return globalForDb.__alsDb;
  const pool =
    globalForDb.__alsPool ??
    new Pool({ connectionString: env.DATABASE_URL });
  const instance = drizzle(pool, { schema });
  globalForDb.__alsPool = pool;
  globalForDb.__alsDb = instance;
  return instance;
}

// Proxy that defers connection until a query method is actually called, so
// importing `db` never touches env at build time.
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
