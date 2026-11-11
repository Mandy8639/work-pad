import { requireMutation, requirePerson } from "@/lib/api";
import { sql } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { normalizeEmail } from "@/lib/text";
import { findPersonByEmail } from "@/lib/users";
import {
  createSession,
  deleteSession,
  readCookie,
  SESSION_COOKIE,
  sessionClearCookie,
  sessionSetCookie,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const person = await requirePerson(request);
  if (person instanceof Response) return person;
  return jsonOk({ user: person });
}

export async function POST(request: Request) {
  const blocked = requireMutation(request);
  if (blocked) return blocked;
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!email) return jsonError(400, "Choose a teammate to continue.", "validation");
  const person = await findPersonByEmail(sql, email);
  if (!person) {
    return jsonError(404, "That teammate is not in this workspace.", "not_found");
  }
  const token = await createSession(sql, person.id);
  const response = jsonOk({ user: person });
  response.headers.set("set-cookie", sessionSetCookie(token));
  return response;
}

export async function DELETE(request: Request) {
  const blocked = requireMutation(request);
  if (blocked) return blocked;
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await deleteSession(sql, token);
  const response = jsonOk({ ok: true });
  response.headers.set("set-cookie", sessionClearCookie());
  return response;
}
