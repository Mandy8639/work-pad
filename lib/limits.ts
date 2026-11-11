export const LIMITS = {
  title: 180,
  htmlCharacters: 400_000,
  fileBytes: 2 * 1024 * 1024,
  documentsPerUser: 80,
  sessionDays: 7,
} as const;

export const ACCEPTED_IMPORT_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"] as const;
