// Applies SQL migrations in db/migrations/*.sql (sorted) to the Supabase Postgres DB.
// Each migration runs once, inside a transaction, and is recorded in schema_migrations.
//
// Connection: uses DATABASE_URL if set, otherwise builds it from the values in
// .env.local (NEXT_PUBLIC_SUPABASE_URL for the project ref + `password` for the DB password).
//
// Usage:
//   node scripts/migrate.mjs            # apply all pending migrations
//   node scripts/migrate.mjs --status   # list applied / pending without running

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const migrationsDir = join(root, "db", "migrations");

function loadEnv() {
  const file = join(root, ".env.local");
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

function buildConnection() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.password;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  if (!password) throw new Error("Missing DB password (`password` or SUPABASE_DB_PASSWORD) in .env.local");
  const ref = new URL(url).hostname.split(".")[0];
  // Passing a config object (not a URL) means the password needs no URL-encoding.
  return {
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: "postgres",
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

async function main() {
  loadEnv();
  const statusOnly = process.argv.includes("--status");

  const files = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()
    : [];

  const client = new pg.Client(buildConnection());
  await client.connect();
  try {
    await client.query(
      `create table if not exists public.schema_migrations (
         name text primary key,
         applied_at timestamptz not null default now()
       )`,
    );
    const { rows } = await client.query(`select name from public.schema_migrations`);
    const applied = new Set(rows.map((r) => r.name));

    if (statusOnly) {
      console.log("Migrations:");
      for (const f of files) console.log(`  ${applied.has(f) ? "[x]" : "[ ]"} ${f}`);
      return;
    }

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log("Nothing to apply — database is up to date.");
      return;
    }

    for (const file of pending) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      process.stdout.write(`Applying ${file} ... `);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query(`insert into public.schema_migrations (name) values ($1)`, [file]);
        await client.query("commit");
        console.log("ok");
      } catch (err) {
        await client.query("rollback");
        console.log("FAILED");
        throw err;
      }
    }
    console.log(`Done — applied ${pending.length} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\nMigration error:", err.message);
  process.exit(1);
});
