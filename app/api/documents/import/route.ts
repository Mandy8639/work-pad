import { requireMutation, requirePerson } from "@/lib/api";
import { sql } from "@/lib/db";
import { createDocument, LibraryLimitError } from "@/lib/documents";
import { jsonError, jsonOk } from "@/lib/http";
import { ImportError, importFileToDocument } from "@/lib/import-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = requireMutation(request);
  if (blocked) return blocked;
  const person = await requirePerson(request);
  if (person instanceof Response) return person;

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
    const document = await createDocument(sql, person, imported.title, imported.html);
    return jsonOk({ document }, 201);
  } catch (error) {
    if (error instanceof ImportError || error instanceof LibraryLimitError) {
      return jsonError(400, error.message, "validation");
    }
    throw error;
  }
}
