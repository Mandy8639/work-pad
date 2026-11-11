import { marked } from "marked";
import mammoth from "mammoth";
import { ACCEPTED_IMPORT_EXTENSIONS, LIMITS } from "./limits";
import { sanitizeDocumentHtml } from "./sanitize";
import { htmlHasVisibleText, titleFromFilename } from "./text";

marked.setOptions({ gfm: true, breaks: false });

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

function extensionOf(filename: string): string {
  const match = filename.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function textToHtml(source: string): string {
  const normalized = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return "";
  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function markdownToHtml(source: string): Promise<string> {
  const parsed = await marked.parse(source, { async: true });
  return typeof parsed === "string" ? parsed : String(parsed);
}

export function acceptedImportLabel(): string {
  return ".txt, .md, and .docx";
}

export async function importFileToDocument(
  filename: string,
  bytes: Uint8Array,
): Promise<{ title: string; html: string }> {
  if (bytes.byteLength === 0) {
    throw new ImportError("That file is empty.");
  }
  if (bytes.byteLength > LIMITS.fileBytes) {
    throw new ImportError("Files need to be 2 MB or smaller.");
  }
  const extension = extensionOf(filename);
  if (!ACCEPTED_IMPORT_EXTENSIONS.includes(extension as (typeof ACCEPTED_IMPORT_EXTENSIONS)[number])) {
    throw new ImportError(`Import ${acceptedImportLabel()} files. Other formats are not turned into a draft.`);
  }

  let raw = "";
  if (extension === ".txt") {
    raw = textToHtml(Buffer.from(bytes).toString("utf8"));
  } else if (extension === ".md" || extension === ".markdown") {
    raw = await markdownToHtml(Buffer.from(bytes).toString("utf8"));
  } else {
    try {
      const converted = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
      raw = converted.value;
    } catch {
      throw new ImportError("That Word file could not be read. Save it as .docx and try again.");
    }
  }

  const html = sanitizeDocumentHtml(raw).slice(0, LIMITS.htmlCharacters);
  if (!htmlHasVisibleText(html)) {
    throw new ImportError("That file did not contain text Folio can edit. Images and complex layout are dropped.");
  }
  return { title: titleFromFilename(filename), html };
}
