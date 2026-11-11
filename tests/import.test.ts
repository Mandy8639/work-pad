import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { importFileToDocument, textToHtml } from "../lib/import-content";
import { sanitizeDocumentHtml } from "../lib/sanitize";
import { excerptFromHtml, normalizeTitle } from "../lib/text";

describe("document html", () => {
  it("keeps formatting and drops scripts and javascript links", () => {
    const clean = sanitizeDocumentHtml(
      `<h1>Plan</h1><p>Keep <strong>this</strong> and <em>this</em>.</p><script>alert("x")</script><a href="javascript:alert(1)">bad</a><a href="https://ajaia.example/notes">notes</a>`,
    );
    assert.match(clean, /<h1>Plan<\/h1>/);
    assert.match(clean, /<strong>this<\/strong>/);
    assert.match(clean, /<em>this<\/em>/);
    assert.doesNotMatch(clean, /script/i);
    assert.doesNotMatch(clean, /javascript:/i);
    assert.match(clean, /href="https:\/\/ajaia\.example\/notes"/);
  });

  it("turns plain text paragraphs into html", () => {
    const html = textToHtml("First paragraph.\n\nSecond line\nstill second.");
    assert.match(html, /<p>First paragraph\.<\/p>/);
    assert.match(html, /<p>Second line<br>still second\.<\/p>/);
    assert.equal(excerptFromHtml(html).includes("<"), false);
  });

  it("imports markdown headings and lists", async () => {
    const imported = await importFileToDocument(
      "launch-notes.md",
      Buffer.from("# Launch\n\n- One\n- Two\n\nA **bold** claim.\n"),
    );
    assert.equal(imported.title, "launch notes");
    assert.match(imported.html, /<h1>Launch<\/h1>/);
    assert.match(imported.html, /<ul>/);
    assert.match(imported.html, /<strong>bold<\/strong>/);
  });

  it("imports a docx file into editable html", async () => {
    const bytes = await readFile(path.join(process.cwd(), "tests/fixtures/sample.docx"));
    const imported = await importFileToDocument("sample.docx", bytes);
    assert.match(imported.html, /Launch checklist/);
    assert.match(imported.html, /Ship the editor/);
  });

  it("rejects an unsupported file type", async () => {
    await assert.rejects(
      () => importFileToDocument("photo.png", Buffer.from("not a document")),
      /txt, \.md, and \.docx/,
    );
  });

  it("rejects an empty title and a title that is too long", () => {
    assert.equal(normalizeTitle("   ").ok, false);
    const titled = normalizeTitle("  Weekly   review  ");
    assert.equal(titled.ok, true);
    if (titled.ok) assert.equal(titled.title, "Weekly review");
    assert.equal(normalizeTitle("a".repeat(181)).ok, false);
  });
});
