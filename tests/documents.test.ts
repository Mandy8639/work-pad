import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  createDocument,
  getDocumentForUser,
  grantShare,
  listLibrary,
  updateDocument,
} from "../lib/documents";
import { applyMigrations } from "../lib/migrate";
import { seedWorkspace } from "../lib/seed";
import type { Sql } from "../lib/sql";

async function database(): Promise<Sql> {
  const db = new PGlite();
  const sql: Sql = async <T>(text: string, params: unknown[] = []) =>
    (await db.query(text, params)).rows as T[];
  await applyMigrations(sql, async (statement) => {
    await db.exec(statement);
  });
  await seedWorkspace(sql);
  return sql;
}

describe("shared documents", () => {
  it("separates owned and shared documents for each teammate", async () => {
    const sql = await database();
    const maya = await listLibrary(sql, "user_maya");
    const sam = await listLibrary(sql, "user_sam");

    assert.deepEqual(maya.owned.map((doc) => doc.id), ["doc_how_we_write"]);
    assert.deepEqual(maya.shared.map((doc) => doc.id), ["doc_launch_notes"]);
    assert.equal(maya.shared[0]?.role, "editor");

    assert.deepEqual(sam.owned.map((doc) => doc.id), ["doc_critique"]);
    assert.equal(sam.shared[0]?.role, "viewer");
    assert.equal(sam.shared.some((doc) => doc.id === "doc_critique"), false);
    assert.equal(
      (await listLibrary(sql, "user_leo")).owned.some((doc) => doc.id === "doc_critique"),
      false,
    );
  });

  it("refuses a stale save and keeps the newer draft", async () => {
    const sql = await database();
    const created = await createDocument(
      sql,
      { id: "user_maya", name: "Maya Chen", email: "maya@folio.example", roleTitle: "Product" },
      "Conflict drill",
      "<p>First</p>",
    );
    const first = await updateDocument(sql, created.id, {
      contentHtml: "<p>Second</p>",
      baseVersion: created.version,
    });
    assert.equal(first.ok, true);
    const stale = await updateDocument(sql, created.id, {
      contentHtml: "<p>Lost</p>",
      baseVersion: created.version,
    });
    assert.deepEqual(stale, { ok: false, reason: "conflict" });
    const latest = await getDocumentForUser(sql, created.id, "user_maya");
    assert.match(latest?.document.contentHtml ?? "", /Second/);
    assert.equal(latest?.role, "owner");
  });

  it("gives a new editor access and leaves everyone else out", async () => {
    const sql = await database();
    const created = await createDocument(
      sql,
      { id: "user_sam", name: "Sam Okonkwo", email: "sam@folio.example", roleTitle: "Design" },
      "Private until shared",
      "<p>Notes</p>",
    );
    assert.equal((await getDocumentForUser(sql, created.id, "user_leo"))?.role, null);
    await grantShare(sql, created.id, "user_leo", "editor");
    assert.equal((await getDocumentForUser(sql, created.id, "user_leo"))?.role, "editor");
    assert.equal((await getDocumentForUser(sql, created.id, "user_maya"))?.role, null);
  });
});
