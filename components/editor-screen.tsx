"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { DocumentEditor } from "@/components/document-editor";
import { ShareDialog } from "@/components/share-dialog";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client-api";
import type { AccessRole, DocumentDetail, Person } from "@/lib/types";

type Loaded = {
  document: DocumentDetail;
  role: AccessRole;
};

export function EditorScreen({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [user, setUser] = useState<Person | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"saved" | "unsaved" | "saving" | "error">("saved");
  const [conflict, setConflict] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [title, setTitle] = useState("");
  const titleRef = useRef("");
  const version = useRef(1);
  const html = useRef("");
  const savedHtml = useRef("");
  const savedTitle = useRef("");
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setError(null);
    setConflict(null);
    try {
      const [me, doc] = await Promise.all([
        api<{ user: Person }>("/api/auth"),
        api<Loaded>(`/api/documents/${documentId}`),
      ]);
      setUser(me.user);
      setLoaded(doc);
      setTitle(doc.document.title);
      titleRef.current = doc.document.title;
      version.current = doc.document.version;
      html.current = doc.document.contentHtml;
      savedHtml.current = doc.document.contentHtml;
      savedTitle.current = doc.document.title;
      setStatus("saved");
      setEpoch((value) => value + 1);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        router.replace("/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Could not open the document.");
    }
  }

  useEffect(() => {
    void load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // Reload only when the document id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (status === "unsaved" || status === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flushRef.current();
      }
    };
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("keydown", onKey);
    };
  }, [status]);

  function schedule() {
    if (conflict) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flushRef.current();
    }, 700);
  }

  async function flush() {
    if (!loaded || loaded.role === "viewer" || conflict) return;
    const nextTitle = titleRef.current.trim();
    const titleChanged = nextTitle !== savedTitle.current;
    const contentChanged = html.current !== savedHtml.current;
    if (!titleChanged && !contentChanged) {
      setStatus("saved");
      return;
    }
    if (!nextTitle) {
      setStatus("error");
      setError("Give the document a title.");
      return;
    }
    const seen = generation.current;
    setStatus("saving");
    setError(null);
    try {
      const payload = await api<Loaded>(`/api/documents/${documentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          baseVersion: version.current,
          ...(titleChanged ? { title: nextTitle } : {}),
          ...(contentChanged ? { contentHtml: html.current } : {}),
        }),
      });
      version.current = payload.document.version;
      if (titleChanged) savedTitle.current = payload.document.title;
      if (contentChanged) savedHtml.current = html.current;
      setLoaded((current) => (current ? { ...current, document: { ...payload.document, contentHtml: current.document.contentHtml } } : current));
      if (generation.current !== seen) schedule();
      else setStatus("saved");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "conflict") {
        setConflict(caught.message);
        setStatus("error");
        return;
      }
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Could not save.");
    }
  }

  flushRef.current = flush;

  function noteEdit(nextHtml: string) {
    html.current = nextHtml;
    if (nextHtml === savedHtml.current) {
      if (titleRef.current.trim() === savedTitle.current) setStatus("saved");
      return;
    }
    generation.current += 1;
    setStatus("unsaved");
    schedule();
  }

  async function importIntoDraft(file: File) {
    if (!loaded || loaded.role === "viewer") return;
    const confirmed = window.confirm(
      "Replace this draft with the file? The current text and title will be overwritten.",
    );
    if (!confirmed) return;
    const body = new FormData();
    body.set("file", file);
    setStatus("saving");
    try {
      const payload = await api<Loaded>(`/api/documents/${documentId}`, { method: "PUT", body });
      setLoaded(payload);
      setTitle(payload.document.title);
      titleRef.current = payload.document.title;
      version.current = payload.document.version;
      html.current = payload.document.contentHtml;
      savedHtml.current = payload.document.contentHtml;
      savedTitle.current = payload.document.title;
      setStatus("saved");
      setEpoch((value) => value + 1);
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Could not import that file.");
    }
  }

  if (error && !loaded) {
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center px-6">
        <h1 className="font-serif text-3xl">This document is not available</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{error}</p>
        <Button asChild className="mt-6 w-fit">
          <Link href="/">Back to the library</Link>
        </Button>
      </main>
    );
  }

  if (!loaded || !user) {
    return (
      <main className="mx-auto flex min-h-svh max-w-3xl items-center px-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Opening the document
        </p>
      </main>
    );
  }

  const viewing = loaded.role === "viewer";
  const statusLabel =
    conflict ? "Needs reload" : status === "saving" ? "Saving" : status === "unsaved" ? "Unsaved" : status === "error" ? "Not saved" : "Saved";

  return (
    <main className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-sm sm:px-5">
        <Button asChild variant="ghost" size="icon" aria-label="Back to library">
          <Link href="/">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <input
          aria-label="Document title"
          value={title}
          disabled={viewing}
          onChange={(event) => {
            titleRef.current = event.target.value;
            setTitle(event.target.value);
            generation.current += 1;
            setStatus("unsaved");
            schedule();
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none disabled:opacity-80 sm:text-base"
        />
        <span className="hidden text-xs text-muted-foreground sm:inline">{statusLabel}</span>
        {!viewing ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void flush()}>
            Save
          </Button>
        ) : null}
        <Button type="button" size="sm" onClick={() => setShareOpen(true)}>
          Share
        </Button>
      </header>

      <div className="mx-auto max-w-3xl px-5 pt-6 pb-24 sm:px-8">
        {viewing ? (
          <p className="mb-6 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            You can read this document. {loaded.document.owner.name} owns it, and viewers cannot edit or rename it.
          </p>
        ) : (
          <p className="mb-2 text-xs text-muted-foreground">
            {loaded.role === "owner" ? "You own this draft." : `${loaded.document.owner.name} owns this draft. You can edit it.`}{" "}
            <span className="sm:hidden">{statusLabel}.</span>
          </p>
        )}
        {conflict ? (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p>{conflict}</p>
            <Button type="button" size="sm" onClick={() => void load()}>
              Reload
            </Button>
          </div>
        ) : null}
        {error && loaded ? (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <article className="rounded-2xl border border-border bg-card px-5 py-6 shadow-[0_1px_0_rgba(60,40,10,0.04)] sm:px-10 sm:py-10">
          <DocumentEditor
            key={`${documentId}:${epoch}`}
            initialHtml={loaded.document.contentHtml}
            editable={!viewing && !conflict}
            onChange={noteEdit}
          />
        </article>
        {!viewing ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Shortcuts: Ctrl or ⌘ B, I, and U. Import replaces this draft.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              Replace with a file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importIntoDraft(file);
              }}
            />
          </div>
        ) : null}
      </div>
      <ShareDialog documentId={documentId} open={shareOpen} onOpenChange={setShareOpen} />
    </main>
  );
}
