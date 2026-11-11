import { LIMITS } from "./limits";

export function excerptFromHtml(html: string, max = 160): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function htmlHasVisibleText(html: string): boolean {
  return excerptFromHtml(html, 20_000).length > 0;
}

export function normalizeTitle(
  input: unknown,
): { ok: true; title: string } | { ok: false; error: string } {
  if (typeof input !== "string") {
    return { ok: false, error: "A title has to be text." };
  }
  const title = input.trim().replace(/\s+/g, " ");
  if (!title) return { ok: false, error: "Give the document a title." };
  if (title.length > LIMITS.title) {
    return { ok: false, error: `Titles are limited to ${LIMITS.title} characters.` };
  }
  return { ok: true, title };
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  const cleaned = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const titled = cleaned || "Imported document";
  return titled.slice(0, LIMITS.title);
}

export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (!email || email.length > 200 || !email.includes("@")) return null;
  return email;
}

export function isSafeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,80}$/.test(id);
}
