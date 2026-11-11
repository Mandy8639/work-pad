# Folio

Folio is a small shared-document editor for an internal team. You sign in as one of three simulated teammates, write with basic rich text, import a text file, and share the draft so another teammate can edit or only read it.

## Run it locally

Requirements: Node.js 22 and npm.

```bash
npm install
npm test
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

`npm run dev` stores documents in `data/pglite`, which is created on first launch and ignored by git. A refresh keeps your drafts. Delete that folder to restore the seeded workspace.

If `DATABASE_URL` is set in the environment, Folio uses that Postgres database instead of the local file. For a normal local run, leave `DATABASE_URL` unset. The production build applies SQL files in `migrations/` when `DATABASE_URL` is present:

```bash
npm run build
npm start
```

## Teammates

There is no password. The sign-in screen enters the workspace as one of these people:

| Name | Email | What to look at |
| --- | --- | --- |
| Maya Chen | maya@folio.example | Owns “How we write at Ajaia”. Can edit Leo’s launch notes. |
| Leo Park | leo@folio.example | Owns “Launch notes”. Can edit Maya’s writing guide. |
| Sam Okonkwo | sam@folio.example | Can view the writing guide. Owns a private critique note the others cannot see. |

Use **Switch teammate** in the library to sign out and enter as someone else.

## What you can do

- Create a document, rename it from the title, and keep typing. Folio saves shortly after you pause, and **Save** writes immediately.
- Format with bold, italic, underline, three heading levels, bulleted lists, numbered lists, and links.
- Reopen a document from the library after a refresh. Owned drafts and drafts shared with you are separate.
- Import `.txt`, `.md`, or `.docx` up to 2 MB. The file becomes a new document. Inside an editor you can also replace the current draft with a file. Images and complex Word layout are dropped.
- Share from the document. The owner chooses **Can edit** or **Can view**, or removes someone. Editors cannot change access. Viewers cannot type.

A two-minute walkthrough of this flow is in [docs/walkthrough.mp4](docs/walkthrough.mp4). See [WALKTHROUGH.txt](WALKTHROUGH.txt).

## Tests

```bash
npm test
npm run lint
```

The tests cover access rules, HTML sanitizing, text and Markdown and Word import, the owned-versus-shared library, and a stale save that must not overwrite a newer version.

## More detail

- [ARCHITECTURE.md](ARCHITECTURE.md) explains the scope cuts and how saving and sharing work.
- [AI_WORKFLOW.md](AI_WORKFLOW.md) explains how the coding agent was used.
- [SUBMISSION.md](SUBMISSION.md) lists the deliverables.
