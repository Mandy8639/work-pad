import { randomBytes } from "node:crypto";
import { LIMITS } from "./limits";
import type { Sql } from "./sql";
import type { Person } from "./types";
import { findPersonById } from "./users";

export const SESSION_COOKIE = "folio_session";

function cookieSecure(): string {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionSetCookie(token: string): string {
  const maxAge = LIMITS.sessionDays * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${cookieSecure()}`;
}

export function sessionClearCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${cookieSecure()}`;
}

export async function createSession(sql: Sql, userId: string): Promise<string> {
  await sql("delete from sessions where expires_at < now()");
  const token = randomBytes(32).toString("hex");
  await sql(
    `insert into sessions (token, user_id, expires_at)
     values ($1, $2, now() + interval '7 days')`,
    [token, userId],
  );
  return token;
}

export async function deleteSession(sql: Sql, token: string): Promise<void> {
  await sql("delete from sessions where token = $1", [token]);
}

export async function personFromRequest(sql: Sql, request: Request): Promise<Person | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || token.length > 200) return null;
  const rows = await sql<{ user_id: string }>(
    "select user_id from sessions where token = $1 and expires_at > now()",
    [token],
  );
  if (!rows[0]) return null;
  return findPersonById(sql, rows[0].user_id);
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = new Set<string>();
  const host = request.headers.get("host");
  if (host) hosts.add(host);
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) hosts.add(forwarded.split(",")[0]?.trim() ?? "");
  return hosts.has(originHost);
}
