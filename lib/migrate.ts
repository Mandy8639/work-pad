import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Sql } from "./sql";

export async function applyMigrations(
  sql: Sql,
  exec: (statement: string) => Promise<void>,
): Promise<void> {
  await exec(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const applied = await sql<{ name: string }>("select name from schema_migrations");
  const done = new Set(applied.map((row) => row.name));
  const directory = path.join(process.cwd(), "migrations");
  const files = (await readdir(directory).catch(() => [] as string[]))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    if (done.has(file)) continue;
    await exec(await readFile(path.join(directory, file), "utf8"));
    await sql("insert into schema_migrations (name) values ($1)", [file]);
  }
}
