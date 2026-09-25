/**
 * Local PGlite database for development/import (PHASE 1).
 * Same Postgres schema as production; swap the driver for Neon when deploying.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "./schema";

export const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
export const DEFAULT_DB_DIR = path.join(PROJECT_ROOT, ".data", "pglite");

export async function openDb(dataDir: string = DEFAULT_DB_DIR) {
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  return { client, db };
}

export async function migrateDb(db: Awaited<ReturnType<typeof openDb>>["db"]) {
  await migrate(db, { migrationsFolder: path.join(PROJECT_ROOT, "drizzle") });
}

export type Db = Awaited<ReturnType<typeof openDb>>["db"];
