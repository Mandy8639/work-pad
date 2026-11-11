import type { AccessRole } from "./types";

export function canRead(role: AccessRole | null): boolean {
  return role !== null;
}

export function canEdit(role: AccessRole | null): boolean {
  return role === "owner" || role === "editor";
}

export function canManageSharing(role: AccessRole | null): boolean {
  return role === "owner";
}

export function canDelete(role: AccessRole | null): boolean {
  return role === "owner";
}

export function isShareRole(value: unknown): value is Exclude<AccessRole, "owner"> {
  return value === "editor" || value === "viewer";
}
