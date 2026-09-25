import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  // Local PGlite database written by `pnpm import:hsk1`; used by `pnpm db:studio`.
  driver: "pglite",
  dbCredentials: { url: "./.data/pglite" },
});
