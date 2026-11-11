"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUpIcon, Loader2Icon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, ApiError } from "@/lib/client-api";
import { formatEdited } from "@/lib/format";
import type { DocumentSummary, LibraryPayload, Person } from "@/lib/types";

export function LibraryScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<Person | null>(null);
  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pending, setPending] = useState<"create" | "import" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DocumentSummary | null>(null);

  async function refresh() {
    const [me, docs] = await Promise.all([
      api<{ user: Person }>("/api/auth"),
      api<LibraryPayload>("/api/documents"),
    ]);
    setUser(me.user);
    setLibrary(docs);
  }

  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch((caught) => {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 401) {
          router.replace("/login");
          return;
        }
        setError(caught instanceof Error ? caught.message : "Could not load the library.");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function createDocument() {
    setPending("create");
    setError(null);
    try {
      const payload = await api<{ document: { id: string } }>("/api/documents", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled document" }),
      });
      router.push(`/documents/${payload.document.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the document.");
      setPending(null);
    }
  }

  async function importFile(file: File) {
    setPending("import");
    setImportError(null);
    const body = new FormData();
    body.set("file", file);
    try {
      const payload = await api<{ document: { id: string } }>("/api/documents/import", {
        method: "POST",
        body,
      });
      router.push(`/documents/${payload.document.id}`);
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : "Could not import that file.");
      setPending(null);
    }
  }

  async function remove(documentId: string) {
    setError(null);
    try {
      await api(`/api/documents/${documentId}`, { method: "DELETE" });
      setPendingDelete(null);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the document.");
    }
  }

  async function leave() {
    await api("/api/auth", { method: "DELETE" });
    document.body.style.pointerEvents = "";
    window.location.assign("/login");
  }

  if (error && !library) {
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center px-6">
        <h1 className="font-serif text-3xl">The library did not load</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-6 w-fit" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </main>
    );
  }

  if (!user || !library) {
    return (
      <main className="mx-auto flex min-h-svh max-w-3xl items-center px-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading your documents
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-svh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="mr-auto flex items-baseline gap-2">
            <span className="font-serif text-2xl tracking-tight">Folio</span>
            <span className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Ajaia</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {user.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void leave()}>Switch teammate</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-4xl tracking-tight">Documents</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Yours are on the left edge in teal. Drafts shared with you are marked in clay. Signed in as {user.name}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={pending !== null} onClick={() => fileRef.current?.click()}>
              {pending === "import" ? <Loader2Icon className="animate-spin" /> : <FileUpIcon />}
              Import
            </Button>
            <Button type="button" disabled={pending !== null} onClick={() => void createDocument()}>
              {pending === "create" ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
              New document
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importFile(file);
              }}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Import accepts .txt, .md, and .docx up to 2 MB. Images and complex Word layout are dropped.
        </p>
        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {importError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {importError}
          </p>
        ) : null}

        <Section
          title="Your documents"
          empty="Nothing you own yet. Start a document or import a file."
          documents={library.owned}
          onDelete={setPendingDelete}
        />
        <Section
          title="Shared with you"
          empty="No one has shared a document with you yet."
          documents={library.shared}
          onDelete={setPendingDelete}
        />
      </div>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this document?</DialogTitle>
            <DialogDescription>
              {pendingDelete ? `“${pendingDelete.title}” will be removed for you and for anyone it was shared with.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => pendingDelete && void remove(pendingDelete.id)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Section({
  title,
  empty,
  documents,
  onDelete,
}: {
  title: string;
  empty: string;
  documents: DocumentSummary[];
  onDelete: (document: DocumentSummary) => void;
}) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
        <span className="text-xs text-muted-foreground">{documents.length}</span>
      </div>
      {documents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((document) => (
            <li key={document.id}>
              <article
                className={`group relative h-full rounded-xl border border-border bg-card p-4 pl-5 ${
                  document.role === "owner" ? "border-l-primary" : "border-l-shared"
                } border-l-[3px]`}
              >
                <Link href={`/documents/${document.id}`} className="block pr-8">
                  <h3 className="font-serif text-xl leading-snug tracking-tight">{document.title}</h3>
                  <p className="mt-2 line-clamp-3 min-h-6 text-sm leading-relaxed text-muted-foreground">
                    {document.excerpt || "Empty document"}
                  </p>
                  <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <RoleBadge role={document.role} />
                    {document.role === "owner" ? <span>You own this</span> : <span>From {document.owner.name}</span>}
                    <span>· {formatEdited(document.updatedAt)}</span>
                  </p>
                </Link>
                {document.role === "owner" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-3 right-3"
                        aria-label={`Actions for ${document.title}`}
                      >
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDelete(document)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RoleBadge({ role }: { role: DocumentSummary["role"] }) {
  if (role === "owner") return <Badge>Owner</Badge>;
  if (role === "editor") return <Badge variant="secondary">Can edit</Badge>;
  return <Badge variant="outline">Can view</Badge>;
}
