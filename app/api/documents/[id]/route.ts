import { requireMutation, requirePerson } from "@/lib/api";
import { sql } from "@/lib/db";
import {
  deleteDocument,
  getDocumentForUser,
  updateDocument,
} from "@/lib/documents";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { ImportError, importFileToDocument } from "@/lib/import-content";
import { LIMITS } from "@/lib/limits";
import { canDelete, canEdit, canRead } from "@/lib/permissions";
import { sanitizeDocumentHtml } from "@/lib/sanitize";
import { htmlHasVisibleText, isSafeId, normalizeTitle } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

async function load(request: Request, id: string) {
  if (!isSafeId(id)) return { error: jsonError(404, "That document is not in this workspace.", "not_found") };
  const person = await requirePerson(request);
  if (person instanceof Response) return { error: person };
  const loaded = await getDocumentForUser(sql, id, person.id);
  if (!loaded) return { error: jsonError(404, "That document is not in this workspace.", "not_found") };
  if (!canRead(loaded.role)) {
    return { error: jsonError(403, "You do not have access to this document.", "forbidden") };
  }
  return { person, loaded };
}

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const result = await load(request, id);
  if ("error" in result && result.error) return result.error;
  if (!("loaded" in result)) return jsonError(500, "Could not load the document.", "error");
  return jsonOk({ document: result.loaded.document, role: result.loaded.role });
}

export async function PATCH(request: Request, context: Context) {
  const blocked = requireMutation(request);
  if (blocked) return blocked;
  const { id } = await context.params;
  const result = await load(request, id);
  if ("error" in result && result.error) return result.error;
  if (!("loaded" in result)) return jsonError(500, "Could not load the document.", "error");
  if (!canEdit(result.loaded.role)) {
    return jsonError(403, "You can read this document, but you cannot edit it.", "forbidden");
  }

  const body = await readJson(request);
  if (!body) return jsonError(400, "The save could not be read.", "validation");
  const baseVersion = Number(body.baseVersion);
  if (!Number.isInteger(baseVersion) || baseVersion < 1) {
    return jsonError(400, "Reload the document and try again.", "validation");
  }

  let title: string | undefined;
  if ("title" in body) {
    const parsed = normalizeTitle(body.title);
    if (!parsed.ok) return jsonError(400, parsed.error, "validation");
    title = parsed.title;
  }

  let contentHtml: string | undefined;
  if ("contentHtml" in body) {
    if (typeof body.contentHtml !== "string") {
      return jsonError(400, "The document body has to be text.", "validation");
    }
    if (body.contentHtml.length > LIMITS.htmlCharacters) {
      return jsonError(400, "This document is too long to save.", "validation");
    }
    contentHtml = sanitizeDocumentHtml(body.contentHtml);
  }

  if (title === undefined && contentHtml === undefined) {
    return jsonError(400, "Nothing changed to save.", "validation");
  }

  const saved = await updateDocument(sql, id, { title, contentHtml, baseVersion });
  if (!saved.ok && saved.reason === "conflict") {
    const latest = await getDocumentForUser(sql, id, result.person.id);
    return jsonError(409, "Someone else saved this document. Reload to see their version before you continue.", "conflict", {
      document: latest?.document ?? null,
    });
  }
  if (!saved.ok) return jsonError(404, "That document is not in this workspace.", "not_found");
  return jsonOk({ document: saved.document, role: result.loaded.role });
}

export async function DELETE(request: Request, context: Context) {
  const blocked = requireMutation(request);
  if (blocked) return blocked;
  const { id } = await context.params;
  const result = await load(request, id);
  if ("error" in result && result.error) return result.error;
  if (!("loaded" in result)) return jsonError(500, "Could not load the document.", "error");
  if (!canDelete(result.loaded.role)) {
    return jsonError(403, "Only the owner can delete this document.", "forbidden");
  }
  const removed = await deleteDocument(sql, id, result.person.id);
  if (!removed) return jsonError(404, "That document is not in this workspace.", "not_found");
  return jsonOk({ ok: true });
}

export async function PUT(request: Request, context: Context) {
  const blocked = requireMutation(request);
  if (blocked) return blocked;
  const { id } = await context.params;
  const result = await load(request, id);
  if ("error" in result && result.error) return result.error;
  if (!("loaded" in result)) return jsonError(500, "Could not load the document.", "error");
  if (!canEdit(result.loaded.role)) {
    return jsonError(403, "You can read this document, but you cannot replace it.", "forbidden");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "The upload could not be read.", "validation");
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "Choose a .txt, .md, or .docx file.", "validation");
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const imported = await importFileToDocument(file.name || "import.txt", bytes);
    if (!htmlHasVisibleText(imported.html)) {
      return jsonError(400, "That file did not contain editable text.", "validation");
    }
    const saved = await updateDocument(sql, id, {
      title: imported.title,
      contentHtml: imported.html,
      baseVersion: result.loaded.document.version,
    });
    if (!saved.ok && saved.reason === "conflict") {
      return jsonError(409, "Someone else saved this document. Reload before importing.", "conflict");
    }
    if (!saved.ok) return jsonError(404, "That document is not in this workspace.", "not_found");
    return jsonOk({ document: saved.document, role: result.loaded.role });
  } catch (error) {
    if (error instanceof ImportError) return jsonError(400, error.message, "validation");
    throw error;
  }
}
