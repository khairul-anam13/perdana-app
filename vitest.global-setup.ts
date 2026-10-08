import { execSync } from "node:child_process";
import pg from "pg";

/** Siapkan database tes: buat bila belum ada, lalu terapkan semua migrasi. */
export default async function setup() {
  const base =
    process.env.DATABASE_URL ?? "postgresql://perdana:perdana_dev_local@localhost:5432/perdana";
  const url = base.replace(/\/[^/?]+(\?|$)/, "/perdana_test$1");
  const admin = base.replace(/\/[^/?]+(\?|$)/, "/postgres$1");

  const client = new pg.Client({ connectionString: admin });
  await client.connect();
  try {
    const exists = await client.query("select 1 from pg_database where datname = 'perdana_test'");
    if (exists.rowCount === 0) await client.query("create database perdana_test");
  } finally {
    await client.end();
  }

  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
}
