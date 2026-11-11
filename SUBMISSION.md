# Submission

Folio is the working product for this exercise. This repository is the source bundle.

## Included

- Source code for the Next.js application
- [README.md](README.md) with local setup, the three teammates, and the import limits
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [AI_WORKFLOW.md](AI_WORKFLOW.md)
- Automated tests in `tests/`, run with `npm test`
- Seeded documents so owner, editor, and viewer are visible immediately
- This file

## Live product

Publish from the Cursor agent view. Choose **public** if a reviewer without a Cursor account needs to open it. The address is shown after that confirmation. It is not guessed here.

The published app uses its own Postgres database. Locally, the same schema runs on PGlite with no extra service.

## Accounts

No passwords.

- Maya Chen, maya@folio.example, product. Owns the writing guide. Editor on Leo’s launch notes.
- Leo Park, leo@folio.example, engineering. Owns the launch notes. Editor on Maya’s guide.
- Sam Okonkwo, sam@folio.example, design. Viewer on the writing guide. Owns a private critique note.

## Walkthrough

See [WALKTHROUGH.txt](WALKTHROUGH.txt). The recording was made in this environment. A Loom or YouTube URL was not available to publish from here.

## Working

- Create, rename, autosave, manual save, refresh, and reopen
- Bold, italic, underline, headings, bulleted lists, numbered lists, links
- Import `.txt`, `.md`, and `.docx` into a new document, or replace the open draft
- Owner, editor, and viewer, with owned and shared sections in the library
- Persistence in PGlite locally and Postgres when `DATABASE_URL` is set
- Stale-save protection when the document version changed
- Tests for access, import, sanitizing, sharing, and conflicts

## Incomplete

- No live cursors or simultaneous merging
- No comments, suggestion mode, or revision browser
- No PDF or Markdown export
- No image upload inside a document
- Word import keeps text structure, not the original layout
- The walkthrough is a video file, not a hosted unlisted link
- A Google Drive folder was not created from this environment. Upload this repository’s files there if the course portal requires that link.

## Next, with a few more hours

Store the previous HTML on each successful save and let the owner restore one revision. The version column and access checks are already in place. I would do that before any live-collaboration work.
