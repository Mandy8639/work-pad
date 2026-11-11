import { requireMutation, requirePerson } from "@/lib/api";
import { sql } from "@/lib/db";
import { getDocumentForUser, grantShare, listShares, revokeShare } from "@/lib/documents";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { canManageSharing, canRead, isShareRole } from "@/lib/permissions";
import { isSafeId, normalizeEmail } from "@/lib/text";
import { findPersonByEmail, listPeople } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const person = await requirePerson(request);
  if (person instanceof Response) return person;
  const { id } = await context.params;
  if (!isSafeId(id)) return jsonError(404, "That document is not in this workspace.", "not_found");
  const loaded = await getDocumentForUser(sql, id, person.id);
  if (!loaded) return jsonError(404, "That document is not in this workspace.", "not_found");
  if (!canRead(loaded.role)) {
    return jsonError(403, "You do not have access to this document.", "forbidden");
  }
  const [shares, people] = await Promise.all([listShares(sql, id), listPeople(sql)]);
  return jsonOk({
    owner: loaded.document.owner,
    role: loaded.role,
    shares,
    people,
  });
}

export async function POST(request: Request, context: Context) {
  const blocked = requireMutation(request);
  if (blocked) return blocked;
  const person = await requirePerson(request);
  if (person instanceof Response) return person;
  const { id } = await context.params;
  if (!isSafeId(id)) return jsonError(404, "That document is not in this workspace.", "not_found");
  const loaded = await getDocumentForUser(sql, id, person.id);
  if (!loaded) return jsonError(404, "That document is not in this workspace.", "not_found");
  if (!canManageSharing(loaded.role)) {
    return jsonError(403, "Only the owner can change who has access.", "forbidden");
  }
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!email) return jsonError(400, "Enter a teammate's email.", "validation");
  if (!isShareRole(body?.role)) {
    return jsonError(400, "Choose whether they can edit or only view.", "validation");
  }
  const teammate = await findPersonByEmail(sql, email);
  if (!teammate) {
    return jsonError(404, "No teammate uses that email. Use a workspace address such as leo@folio.example.", "not_found");
  }
  if (teammate.id === loaded.document.owner.id) {
    return jsonError(400, "The owner already has access.", "validation");
  }
  await grantShare(sql, id, teammate.id, body.role);
  const shares = await listShares(sql, id);
  return jsonOk({ shares });
}

export async function DELETE(request: Request, context: Context) {
  const blocked = requireMutation(request);
  if (blocked) return blocked;
  const person = await requirePerson(request);
  if (person instanceof Response) return person;
  const { id } = await context.params;
  if (!isSafeId(id)) return jsonError(404, "That document is not in this workspace.", "not_found");
  const loaded = await getDocumentForUser(sql, id, person.id);
  if (!loaded) return jsonError(404, "That document is not in this workspace.", "not_found");
  if (!canManageSharing(loaded.role)) {
    return jsonError(403, "Only the owner can change who has access.", "forbidden");
  }
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  if (!isSafeId(userId)) return jsonError(400, "Choose a person to remove.", "validation");
  const removed = await revokeShare(sql, id, userId);
  if (!removed) return jsonError(404, "That person does not have a share to remove.", "not_found");
  const shares = await listShares(sql, id);
  return jsonOk({ shares });
}
