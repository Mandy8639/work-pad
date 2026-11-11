import { jsonError } from "@/lib/http";
import { sql } from "@/lib/db";
import { personFromRequest, sameOrigin } from "@/lib/session";
import type { Person } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function requirePerson(request: Request): Promise<Person | Response> {
  const person = await personFromRequest(sql, request);
  if (!person) {
    return jsonError(401, "Sign in as a teammate to continue.", "unauthorized");
  }
  return person;
}

export function requireMutation(request: Request): Response | null {
  if (request.method === "GET" || request.method === "HEAD") return null;
  if (!sameOrigin(request)) {
    return jsonError(403, "This request was rejected.", "forbidden");
  }
  return null;
}
