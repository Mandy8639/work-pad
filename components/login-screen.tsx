"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";
import { WORKSPACE_USERS } from "@/lib/workspace";

export function LoginScreen() {
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.pointerEvents = "";
    document.body.removeAttribute("data-scroll-locked");
  }, []);

  async function enter(email: string) {
    setPendingEmail(email);
    setError(null);
    try {
      await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      window.location.assign("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not enter the workspace.");
      setPendingEmail(null);
    }
  }

  return (
    <main className="min-h-svh bg-background lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
      <section className="relative flex flex-col justify-between bg-primary px-6 py-8 text-primary-foreground sm:px-10 lg:px-14 lg:py-12">
        <div>
          <p className="text-xs font-medium tracking-[0.22em] uppercase opacity-80">Ajaia · internal</p>
          <h1 className="mt-6 max-w-md font-serif text-5xl leading-[1.05] font-medium tracking-tight sm:text-6xl">
            Folio
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-primary-foreground/85">
            Shared drafts for people who already work together. Write the note, hand it to one teammate, and keep the formatting when you come back.
          </p>
        </div>
        <ol className="mt-10 max-w-md space-y-4 text-sm leading-relaxed text-primary-foreground/80">
          <li className="flex gap-3">
            <span className="font-serif text-lg text-primary-foreground">01</span>
            One owner. Editors change the draft. Viewers can only read it.
          </li>
          <li className="flex gap-3">
            <span className="font-serif text-lg text-primary-foreground">02</span>
            Import a .txt, .md, or .docx file and keep editing it here.
          </li>
          <li className="flex gap-3">
            <span className="font-serif text-lg text-primary-foreground">03</span>
            This workspace is simulated. Pick a teammate. There is no password.
          </li>
        </ol>
      </section>

      <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
        <p className="text-sm font-medium text-muted-foreground">Enter as</p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight">Choose a teammate</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Maya, Leo, and Sam already share two documents. Use them to see an owner, an editor, and a viewer on the same draft.
        </p>
        <div className="mt-8 flex max-w-md flex-col gap-3">
          {WORKSPACE_USERS.map((person) => {
            const pending = pendingEmail === person.email;
            return (
              <Button
                key={person.id}
                type="button"
                variant="outline"
                className="h-auto justify-start gap-3 rounded-xl border-border bg-card px-3 py-3 text-left hover:bg-accent"
                disabled={pendingEmail !== null}
                onClick={() => enter(person.email)}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-medium text-secondary-foreground">
                  {pending ? <Loader2Icon className="size-4 animate-spin" /> : person.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{person.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {person.roleTitle} · {person.email}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
        {error ? (
          <p className="mt-4 max-w-md text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
