import { requireMutation, requirePerson } from "@/lib/api";
import { sql } from "@/lib/db";
import { createDocument, LibraryLimitError, listLibrary } from "@/lib/documents";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { normalizeTitle } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const person = await requirePerson(request);
  if (person instanceof Response) return person;
  const library = await listLibrary(sql, person.id);
  return jsonOk(library);
}

export async function POST(request: Request) {
  const blocked = requireMutation(request);
  if (blocked) return blocked;
  const person = await requirePerson(request);
  if (person instanceof Response) return person;
  const body = await readJson(request);
  const title = normalizeTitle(body?.title ?? "Untitled document");
  if (!title.ok) return jsonError(400, title.error, "validation");
  try {
    const document = await createDocument(sql, person, title.title, "");
    return jsonOk({ document }, 201);
  } catch (error) {
    if (error instanceof LibraryLimitError) return jsonError(400, error.message, "limit");
    throw error;
  }
}
