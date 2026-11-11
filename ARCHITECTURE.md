# Architecture

Folio is one Next.js application. The browser edits a document. Route handlers check who is signed in, what they are allowed to do, and then read or write Postgres. Locally, the same queries run against PGlite in `data/pglite`, so a reviewer does not need a database server.

## What was prioritized

The editing loop had to feel coherent: create, type, format, leave, and come back to the same draft. Sharing had to be visible, because that is the part a reviewer can misunderstand. File import had to land in the same editor, not in a side inbox. Those three paths are implemented end to end.

Real-time multiplayer was cut. Two people can both be editors, but they do not see each other’s cursors. Each save carries the version the editor loaded. If that version is no longer current, the save is rejected and the screen asks for a reload. That is last-writer protection, not collaborative merging. It is the right cut for this scope: it prevents silent data loss without a CRDT or a hosted collaboration service.

## Request path

1. The sign-in screen posts a teammate email to `POST /api/auth`.
2. The server creates a random session token, stores it in `sessions`, and sets an `HttpOnly`, `SameSite=Lax` cookie. The token is not written into the page.
3. Document routes load that session and then the caller’s role on the document: owner, editor, viewer, or none.
4. Reads require a role. Content edits require owner or editor. Delete and sharing require the owner. A viewer’s save is rejected. A person with no role gets no document.

The three teammates are seeded. Maya owns the writing guide and shares it with Leo as an editor and Sam as a viewer. Leo owns the launch notes and shares them with Maya as an editor. Sam’s critique note is unshared, so the other two libraries do not list it. Signing in is simulated on purpose: a reviewer can switch people without accounts, and the repository does not contain a password or signing secret.

## Storage

`migrations/001_init.sql` creates `users`, `documents`, `shares`, and `sessions`. Document body is sanitized HTML, plus an integer `version`. HTML matches what the editor already produces and what `.docx` and Markdown import already return. It is sanitized on write with an allowlist: headings, paragraphs, emphasis, lists, and `http`, `https`, and `mailto` links. Scripts and `javascript:` URLs are removed.

PGlite applies those migrations on first launch and records them in `schema_migrations`. A published deployment sets `DATABASE_URL`; `npm run build` runs `scripts/migrate.mjs` against Postgres, and the server uses the same SQL. Queries pass values as parameters.

Imported files are read in memory and are not stored on disk. The limit is 2 MB and 80 owned documents per person, so one caller cannot grow storage without bound.

## Interface

The library is the home. A teal edge means you own the document. A clay edge means someone shared it with you. The editor is a single paper column with a formatting bar. The title is the rename control. Share opens the access list. Empty, loading, and failure states are written on the library and the document page.

## What is not here

- Live cursors, presence, or character-level merging
- Comments, suggestions, or a version timeline
- Export to PDF or Markdown
- Image upload inside the document
- Password login, SSO, or per-team administration

## With another few hours

I would add a short revision list: each successful save stores the previous HTML, and the owner can restore one. That uses the version column that is already there and stays inside the current access rules. I would not start multiplayer cursors before that history exists.
