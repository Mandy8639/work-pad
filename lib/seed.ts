import { sanitizeDocumentHtml } from "./sanitize";
import type { Sql } from "./sql";
import { WORKSPACE_USERS } from "./workspace";

const HOW_WE_WRITE = sanitizeDocumentHtml(`
  <p>Folio is for the draft someone else still needs to touch. Keep the decision, the launch note, or the spec here while it is changing. Leave finished files where they already live.</p>
  <h2>What belongs in a Folio doc</h2>
  <ul>
    <li>A decision with the options still visible</li>
    <li>A launch note a teammate will revise</li>
    <li>A short spec that is not ready to freeze</li>
  </ul>
  <h2>How sharing works in this workspace</h2>
  <ol>
    <li>The owner creates the document and can delete it.</li>
    <li>An editor can change the words and the title.</li>
    <li>A viewer can read, and cannot overwrite the draft.</li>
  </ol>
  <p>Maya owns this note. <strong>Leo can edit it.</strong> <em>Sam can read it.</em> Switch teammates from the account menu to see the difference.</p>
`);

const LAUNCH_NOTES = sanitizeDocumentHtml(`
  <p>Internal checklist for the first Folio workspace. This draft is Leo's. Maya can edit it.</p>
  <h2>Ready</h2>
  <ul>
    <li>Create, rename, and reopen a document</li>
    <li>Bold, italic, underline, headings, and lists</li>
    <li>Import a text, Markdown, or Word file</li>
  </ul>
  <h2>Still out of scope</h2>
  <ol>
    <li>Live cursors for two people in the same draft</li>
    <li>Comments and suggestion mode</li>
    <li>A full version history</li>
  </ol>
  <p>If two people save at once, Folio keeps the first save and asks the other person to reload.</p>
`);

const CRITIQUE = sanitizeDocumentHtml(`
  <p>Sam's private scratch pad. It is not shared, so Maya and Leo should not see it in their libraries.</p>
  <h2>Look for</h2>
  <ul>
    <li>Whether owned and shared documents are easy to tell apart</li>
    <li>Whether a viewer is actually blocked from editing</li>
    <li>Whether an imported file keeps headings and lists</li>
  </ul>
`);

export async function seedWorkspace(sql: Sql): Promise<void> {
  for (const user of WORKSPACE_USERS) {
    await sql(
      `insert into users (id, email, name, role_title)
       values ($1, $2, $3, $4)
       on conflict (id) do update
         set email = excluded.email,
             name = excluded.name,
             role_title = excluded.role_title`,
      [user.id, user.email, user.name, user.roleTitle],
    );
  }

  const docs = [
    ["doc_how_we_write", "user_maya", "How we write at Ajaia", HOW_WE_WRITE],
    ["doc_launch_notes", "user_leo", "Launch notes", LAUNCH_NOTES],
    ["doc_critique", "user_sam", "Critique notes", CRITIQUE],
  ] as const;

  for (const [id, ownerId, title, html] of docs) {
    await sql(
      `insert into documents (id, owner_id, title, content_html)
       values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      [id, ownerId, title, html],
    );
  }

  const shares = [
    ["doc_how_we_write", "user_leo", "editor"],
    ["doc_how_we_write", "user_sam", "viewer"],
    ["doc_launch_notes", "user_maya", "editor"],
  ] as const;

  for (const [documentId, userId, role] of shares) {
    await sql(
      `insert into shares (document_id, user_id, role)
       values ($1, $2, $3)
       on conflict (document_id, user_id) do nothing`,
      [documentId, userId, role],
    );
  }
}
