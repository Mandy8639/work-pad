import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canDelete, canEdit, canManageSharing, canRead, isShareRole } from "../lib/permissions";

describe("document access", () => {
  it("lets the owner read, edit, share, and delete", () => {
    assert.equal(canRead("owner"), true);
    assert.equal(canEdit("owner"), true);
    assert.equal(canManageSharing("owner"), true);
    assert.equal(canDelete("owner"), true);
  });

  it("lets an editor change the draft without managing access", () => {
    assert.equal(canRead("editor"), true);
    assert.equal(canEdit("editor"), true);
    assert.equal(canManageSharing("editor"), false);
    assert.equal(canDelete("editor"), false);
  });

  it("keeps a viewer on read-only access", () => {
    assert.equal(canRead("viewer"), true);
    assert.equal(canEdit("viewer"), false);
    assert.equal(canManageSharing("viewer"), false);
    assert.equal(canDelete("viewer"), false);
  });

  it("hides a document from someone with no role", () => {
    assert.equal(canRead(null), false);
    assert.equal(canEdit(null), false);
    assert.equal(canManageSharing(null), false);
    assert.equal(canDelete(null), false);
  });

  it("only accepts editor and viewer as share roles", () => {
    assert.equal(isShareRole("editor"), true);
    assert.equal(isShareRole("viewer"), true);
    assert.equal(isShareRole("owner"), false);
    assert.equal(isShareRole("admin"), false);
  });
});
