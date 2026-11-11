export type AccessRole = "owner" | "editor" | "viewer";

export type Person = {
  id: string;
  name: string;
  email: string;
  roleTitle: string;
};

export type DocumentDetail = {
  id: string;
  title: string;
  contentHtml: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  owner: Person;
};

export type DocumentSummary = {
  id: string;
  title: string;
  excerpt: string;
  version: number;
  updatedAt: string;
  owner: Person;
  role: AccessRole;
};

export type ShareGrant = {
  user: Person;
  role: Exclude<AccessRole, "owner">;
  createdAt: string;
};

export type LibraryPayload = {
  owned: DocumentSummary[];
  shared: DocumentSummary[];
};
