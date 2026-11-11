"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/client-api";
import type { Person, ShareGrant } from "@/lib/types";

type ShareResponse = {
  owner: Person;
  role: "owner" | "editor" | "viewer";
  shares: ShareGrant[];
  people: Person[];
};

export function ShareDialog({
  documentId,
  open,
  onOpenChange,
}: {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<ShareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    api<ShareResponse>(`/api/documents/${documentId}/shares`)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load access.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, documentId]);

  const canManage = data?.role === "owner";
  const available = (data?.people ?? []).filter(
    (person) => person.id !== data?.owner.id && !data?.shares.some((share) => share.user.id === person.id),
  );

  async function grant() {
    if (!email) return;
    setPending(true);
    setError(null);
    try {
      const payload = await api<{ shares: ShareGrant[] }>(`/api/documents/${documentId}/shares`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      setData((current) => (current ? { ...current, shares: payload.shares } : current));
      setEmail("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update access.");
    } finally {
      setPending(false);
    }
  }

  async function updateRole(share: ShareGrant, next: "editor" | "viewer") {
    setError(null);
    try {
      const payload = await api<{ shares: ShareGrant[] }>(`/api/documents/${documentId}/shares`, {
        method: "POST",
        body: JSON.stringify({ email: share.user.email, role: next }),
      });
      setData((current) => (current ? { ...current, shares: payload.shares } : current));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update access.");
    }
  }

  async function revoke(userId: string) {
    setError(null);
    try {
      const payload = await api<{ shares: ShareGrant[] }>(
        `/api/documents/${documentId}/shares?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      setData((current) => (current ? { ...current, shares: payload.shares } : current));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update access.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this document</DialogTitle>
          <DialogDescription>
            Owners manage access. Editors can change the draft. Viewers can read it and cannot save over it.
          </DialogDescription>
        </DialogHeader>
        {!data && !error ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Loading access
          </p>
        ) : null}
        {data ? (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2">
              <li className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <PersonLine person={data.owner} />
                <span className="text-xs font-medium text-muted-foreground">Owner</span>
              </li>
              {data.shares.map((share) => (
                <li key={share.user.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <PersonLine person={share.user} />
                  {canManage ? (
                    <span className="flex items-center gap-1">
                      <select
                        aria-label={`Access for ${share.user.name}`}
                        className="h-8 rounded-lg border border-input bg-card px-2 text-xs"
                        value={share.role}
                        onChange={(event) => updateRole(share, event.target.value as "editor" | "viewer")}
                      >
                        <option value="editor">Can edit</option>
                        <option value="viewer">Can view</option>
                      </select>
                      <Button type="button" variant="ghost" size="sm" onClick={() => revoke(share.user.id)}>
                        Remove
                      </Button>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {share.role === "editor" ? "Can edit" : "Can view"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {canManage ? (
              available.length > 0 ? (
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void grant();
                  }}
                >
                  <select
                    aria-label="Teammate"
                    className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-2 text-sm"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  >
                    <option value="">Add a teammate</option>
                    {available.map((person) => (
                      <option key={person.id} value={person.email}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Access level"
                    className="h-8 rounded-lg border border-input bg-card px-2 text-sm"
                    value={role}
                    onChange={(event) => setRole(event.target.value as "editor" | "viewer")}
                  >
                    <option value="editor">Can edit</option>
                    <option value="viewer">Can view</option>
                  </select>
                  <Button type="submit" disabled={!email || pending}>
                    {pending ? "Adding" : "Share"}
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">Everyone in this workspace already has access.</p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Only the owner can grant or remove access.</p>
            )}
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PersonLine({ person }: { person: Person }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-medium">{person.name}</span>
      <span className="block truncate text-xs text-muted-foreground">{person.email}</span>
    </span>
  );
}
