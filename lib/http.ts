const NO_STORE = { "cache-control": "private, no-store" };

export function jsonOk(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function jsonError(status: number, error: string, code: string, extra?: Record<string, unknown>): Response {
  return Response.json({ error, code, ...extra }, { status, headers: NO_STORE });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
