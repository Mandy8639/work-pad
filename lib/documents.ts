import { excerptFromHtml } from "./text";

export class LibraryLimitError extends Error {
  constructor() {
    super(`The library is limited to ${LIMITS.documentsPerUser} documents you own.`);
    this.name = "LibraryLimitError";
  }
}
import { LIMITS } from "./limits";
import type { Sql } from "./sql";
import type {
  AccessRole,
  DocumentDetail,
  DocumentSummary,
  LibraryPayload,
  Person,
  ShareGrant,
} from "./types";

type DocumentRow = {
  id: string;
  title: string;
  content_html: string;
  version: number | string;
  created_at: string | Date;
  updated_at: string | Date;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_role_title: string;
  access_role: string | null;
};

function iso(value: string | Date): string {
  return new Date(value).toISOString();
}

function mapDocument(row: DocumentRow): DocumentDetail {
  return {
    id: row.id,
    title: row.title,
    contentHtml: row.content_html,
    version: Number(row.version),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    owner: {
      id: row.owner_id,
      name: row.owner_name,
      email: row.owner_email,
      roleTitle: row.owner_role_title,
    },
  };
}

function asRole(value: string | null): AccessRole | null {
  if (value === "owner" || value === "editor" || value === "viewer") return value;
  return null;
}

const DOCUMENT_SELECT = `
  select d.id, d.title, d.content_html, d.version, d.created_at, d.updated_at,
         d.owner_id, u.name as owner_name, u.email as owner_email, u.role_title as owner_role_title,
         case when d.owner_id = $2 then 'owner' else s.role end as access_role
  from documents d
  join users u on u.id = d.owner_id
  left join shares s on s.document_id = d.id and s.user_id = $2
`;

export async function listLibrary(sql: Sql, userId: string): Promise<LibraryPayload> {
  const rows = await sql<DocumentRow>(
    `${DOCUMENT_SELECT}
     where d.owner_id = $1 or s.user_id = $1
     order by d.updated_at desc
     limit 200`,
    [userId, userId],
  );
  const owned: DocumentSummary[] = [];
  const shared: DocumentSummary[] = [];
  for (const row of rows) {
    const role = asRole(row.access_role);
    if (!role) continue;
    const summary: DocumentSummary = {
      id: row.id,
      title: row.title,
      excerpt: excerptFromHtml(row.content_html),
      version: Number(row.version),
      updatedAt: iso(row.updated_at),
      owner: {
        id: row.owner_id,
        name: row.owner_name,
        email: row.owner_email,
        roleTitle: row.owner_role_title,
      },
      role,
    };
    if (role === "owner") owned.push(summary);
    else shared.push(summary);
  }
  return { owned, shared };
}

export async function getDocumentForUser(
  sql: Sql,
  documentId: string,
  userId: string,
): Promise<{ document: DocumentDetail; role: AccessRole | null } | null> {
  const rows = await sql<DocumentRow>(`${DOCUMENT_SELECT} where d.id = $1`, [
    documentId,
    userId,
  ]);
  const row = rows[0];
  if (!row) return null;
  return { document: mapDocument(row), role: asRole(row.access_role) };
}

export async function countOwned(sql: Sql, userId: string): Promise<number> {
  const rows = await sql<{ count: number | string }>(
    "select count(*)::int as count from documents where owner_id = $1",
    [userId],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function createDocument(
  sql: Sql,
  owner: Person,
  title: string,
  contentHtml = "",
): Promise<DocumentDetail> {
  const owned = await countOwned(sql, owner.id);
  if (owned >= LIMITS.documentsPerUser) throw new LibraryLimitError();
  const id = `doc_${crypto.randomUUID()}`;
  await sql(
    `insert into documents (id, owner_id, title, content_html) values ($1, $2, $3, $4)`,
    [id, owner.id, title, contentHtml],
  );
  const loaded = await getDocumentForUser(sql, id, owner.id);
  if (!loaded?.document) throw new Error("The document could not be created.");
  return loaded.document;
}

export async function updateDocument(
  sql: Sql,
  documentId: string,
  patch: { title?: string; contentHtml?: string; baseVersion: number },
): Promise<
  | { ok: true; document: DocumentDetail }
  | { ok: false; reason: "conflict" | "missing" }
> {
  const sets = ["version = version + 1", "updated_at = now()"];
  const params: unknown[] = [];
  if (patch.title !== undefined) {
    params.push(patch.title);
    sets.push(`title = $${params.length}`);
  }
  if (patch.contentHtml !== undefined) {
    params.push(patch.contentHtml);
    sets.push(`content_html = $${params.length}`);
  }
  params.push(documentId);
  const idIndex = params.length;
  params.push(patch.baseVersion);
  const versionIndex = params.length;
  const updated = await sql<{ id: string }>(
    `update documents set ${sets.join(", ")} where id = $${idIndex} and version = $${versionIndex} returning id`,
    params,
  );
  if (updated.length === 0) {
    const stillThere = await sql<{ id: string }>("select id from documents where id = $1", [
      documentId,
    ]);
    return { ok: false, reason: stillThere.length ? "conflict" : "missing" };
  }
  const rows = await sql<DocumentRow>(
    `${DOCUMENT_SELECT} where d.id = $1`,
    [documentId, ""],
  );
  const row = rows[0];
  if (!row) return { ok: false, reason: "missing" };
  return { ok: true, document: mapDocument(row) };
}

export async function deleteDocument(sql: Sql, documentId: string, ownerId: string): Promise<boolean> {
  const rows = await sql<{ id: string }>(
    "delete from documents where id = $1 and owner_id = $2 returning id",
    [documentId, ownerId],
  );
  return rows.length > 0;
}

type ShareRow = {
  role: "editor" | "viewer";
  created_at: string | Date;
  id: string;
  email: string;
  name: string;
  role_title: string;
};

export async function listShares(sql: Sql, documentId: string): Promise<ShareGrant[]> {
  const rows = await sql<ShareRow>(
    `select s.role, s.created_at, u.id, u.email, u.name, u.role_title
     from shares s
     join users u on u.id = s.user_id
     where s.document_id = $1
     order by u.name asc`,
    [documentId],
  );
  return rows.map((row) => ({
    role: row.role,
    createdAt: iso(row.created_at),
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      roleTitle: row.role_title,
    },
  }));
}

export async function grantShare(
  sql: Sql,
  documentId: string,
  userId: string,
  role: "editor" | "viewer",
): Promise<void> {
  await sql(
    `insert into shares (document_id, user_id, role)
     values ($1, $2, $3)
     on conflict (document_id, user_id) do update set role = excluded.role`,
    [documentId, userId, role],
  );
}

export async function revokeShare(sql: Sql, documentId: string, userId: string): Promise<boolean> {
  const rows = await sql<{ user_id: string }>(
    "delete from shares where document_id = $1 and user_id = $2 returning user_id",
    [documentId, userId],
  );
  return rows.length > 0;
}
