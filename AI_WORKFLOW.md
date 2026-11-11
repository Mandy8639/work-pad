# AI workflow

I used Cursor’s cloud coding agent, Grok 4.7, as the implementation partner for this exercise. The product decisions stayed explicit in the prompt and in review of the result. The agent did not get a blank “build Google Docs” instruction and a free hand on scope.

## Where it sped the work up

- Scaffolding the Next.js app, Tailwind, and the shadcn primitives, then installing the editor, Word converter, and database clients.
- Drafting the route handlers, the PGlite and Postgres data module, and the first pass of the library and editor screens from a written data model.
- Generating the migration, the seed documents, and the test files once the access rules were specified.

That compressed the mechanical parts: project setup, repetitive query mapping, and the first UI structure.

## What was rejected or rewritten

- A full collaborative backend was not accepted. The agent’s first design note included real-time presence as an optional stretch. It stayed out. The shipped behavior is version-checked autosave, covered by a test that a stale version cannot overwrite a newer body.
- Password hashes for the demo accounts were not added. A shared password in the repository would look like a secret and would not help a reviewer. Sign-in is an explicit simulated workspace with three named teammates.
- The editor does not store unsanitized HTML from the model’s sample markup. Import and save both run through an allowlist, and a test checks that a script and a `javascript:` link do not survive.
- Generic starter copy and the default Next.js page were replaced. The seeded documents describe the actual sharing rules so a reviewer can see owner, editor, and viewer without reading the code first.
- Duplicate TipTap extensions were removed after checking the installed Starter Kit, which already registers link and underline. Those are configured once.

## How correctness was checked

- `npm test` covers permissions, sanitizing, `.txt` / `.md` / `.docx` import, library separation, sharing, and the version conflict.
- `npm run lint` and `tsc --noEmit` were run on the app.
- The running app was clicked through in a browser: sign in, edit and format, reload, import, share, and open the same document as another teammate.
- A walkthrough recording covers that path. The recording is a file in this project, not a Loom upload, because this environment cannot publish to Loom or YouTube.

The agent accelerated typing. The scope, the access rules, and the decision to stop at conflict detection instead of live collaboration were reviewed against the assignment rather than taken from the first generated plan.
