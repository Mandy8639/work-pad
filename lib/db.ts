import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { applyMigrations } from "./migrate";
import { seedWorkspace } from "./seed";
import type { Sql } from "./sql";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

type DbGlobals = {
  folioPool?: pg.Pool;
  folioLocal?: Promise<PGlite>;
  folioReady?: Promise<void>;
};

const globals = globalThis as unknown as DbGlobals;

export type { Sql };

async function startLocal(): Promise<PGlite> {
  const directory = path.join(process.cwd(), "data", "pglite");
  await mkdir(directory, { recursive: true });
  const db = new PGlite(directory);
  const query: Sql = async <T>(text: string, params: unknown[] = []) =>
    (await db.query(text, params)).rows as T[];
  await applyMigrations(query, async (statement) => {
    await db.exec(statement);
  });
  await seedWorkspace(query);
  return db;
}

async function ensurePostgres(): Promise<void> {
  globals.folioPool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
  const pool = globals.folioPool;
  const query: Sql = async <T>(text: string, params: unknown[] = []) =>
    (await pool.query(text, params)).rows as T[];
  await applyMigrations(query, async (statement) => {
    await pool.query(statement);
  });
  await seedWorkspace(query);
}

export function ensureReady(): Promise<void> {
  globals.folioReady ??= (
    databaseUrl !== ""
      ? ensurePostgres()
      : startLocal().then((db) => {
          globals.folioLocal = Promise.resolve(db);
        })
  ).catch((error: unknown) => {
    globals.folioReady = undefined;
    globals.folioLocal = undefined;
    throw error;
  });
  return globals.folioReady;
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  await ensureReady();
  if (databaseUrl !== "") {
    globals.folioPool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await globals.folioPool.query(text, params)).rows as T[];
  }
  const db = await globals.folioLocal;
  if (!db) throw new Error("Local database failed to start.");
  return (await db.query<T>(text, params)).rows;
}
