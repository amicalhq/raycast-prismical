export interface Note {
  id: string;
  title: string;
  icon_url?: string | null;
  updated_at: string;
  excerpt?: string | null;
  body?: string | null;
  can_write?: boolean;
  folder_name?: string | null;
  trashed_at?: string | null;
}
export interface Identity {
  org: { id: string; name: string };
  org_user_id: string;
}
export interface Page<T> {
  results: T[];
  has_more: boolean;
  next_cursor?: string;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public uncertain: boolean,
    message: string,
  ) {
    super(message);
  }
}
export function origin(value: string) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw new Error("Enter an API origin without credentials, path, or query.");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))
    throw new Error("Use HTTPS for your Prismical server.");
  return url.origin;
}
export class Api {
  readonly base: string;
  constructor(
    base: string,
    private key: string,
    private fetcher: typeof fetch = fetch,
  ) {
    this.base = origin(base);
  }
  async request<T>(path: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
    if (!this.key.trim()) throw new Error("Add a Prismical API key in extension preferences to use cloud notes.");
    let response: Response;
    try {
      response = await this.fetcher(this.base + path, {
        method,
        redirect: "error",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError(
        0,
        method !== "GET",
        method === "GET"
          ? "Could not reach Prismical. Check your connection and API URL."
          : "Connection interrupted. The change may have saved. Check the note before trying again.",
      );
    }
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: "API key is missing, expired, or revoked. Update extension preferences.",
        403: "You do not have permission for this action.",
        404: "This note is unavailable or has been deleted.",
        429: "Too many requests. Wait a moment before trying again.",
        503: "The note service is unavailable. Your draft is preserved.",
      };
      throw new ApiError(
        response.status,
        method !== "GET" && response.status >= 500,
        messages[response.status] ?? `Prismical returned HTTP ${response.status}.`,
      );
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError(
        response.status,
        method !== "GET",
        "Prismical returned an unreadable response. Check whether the change saved before retrying.",
      );
    }
  }
  me(signal?: AbortSignal) {
    return this.request<Identity>("/v1/whoami", "GET", undefined, signal);
  }
  note(id: string, signal?: AbortSignal) {
    return this.request<Note>(`/v1/notes/${encodeURIComponent(id)}?include_body=1`, "GET", undefined, signal);
  }
  async notes(query: string, cursor = "", signal?: AbortSignal): Promise<{ notes: Note[]; next?: string }> {
    if (query.trim()) {
      const page = await this.request<{
        results: Array<{ note_id: string; title: string; content_text: string; updated_at: string }>;
        total: number;
      }>(
        "/v1/search?" + new URLSearchParams({ query: query.trim(), limit: "30", offset: cursor || "0" }),
        "GET",
        undefined,
        signal,
      );
      const next = Number(cursor || 0) + page.results.length;
      return {
        notes: page.results.map((n) => ({
          id: n.note_id,
          title: n.title,
          excerpt: n.content_text,
          updated_at: n.updated_at,
        })),
        next: next < page.total && page.results.length ? String(next) : undefined,
      };
    }
    const page = await this.request<Page<Note>>(
      "/v1/notes?" +
        new URLSearchParams({ limit: "30", sort: "updated_at", order: "desc", ...(cursor ? { cursor } : {}) }),
      "GET",
      undefined,
      signal,
    );
    return { notes: page.results.filter((n) => !n.trashed_at), next: page.has_more ? page.next_cursor : undefined };
  }
  create(title: string, folderId: string) {
    return this.request<Note>("/v1/notes", "POST", {
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(folderId ? { folder_id: folderId } : {}),
    });
  }
  write(id: string, markdown: string, mode: "append" | "replace") {
    return this.request<Note>(`/v1/notes/${encodeURIComponent(id)}/content`, "PUT", { markdown, mode });
  }
  transcript(id: string) {
    return this.request<{ results: { recording_id: string; created_at: string; text: string }[]; truncated: boolean }>(
      `/v1/notes/${encodeURIComponent(id)}/transcript`,
    );
  }
}
