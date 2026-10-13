/**
 * Version history as the post page uses it in the browser.
 *
 * The page itself only carries the list of versions (when each was captured
 * and which fields changed). The versions' content is held by zap.ms and
 * given to signed-in visitors through `/zap/api/v1/mc/<id>/history`, so no
 * page is built per version. A visitor picks what to look at through the
 * address: `?v=3` opens version 3, `?from=2&to=5` compares two.
 *
 * Kept free of imports so the node test runner can load it directly.
 */

/** One row of the timeline, built into the page. Numbers start at 1. */
export interface VersionEntry {
  number: number
  /** The capture time as older links spelled it; see `resolveVersion`. */
  slug: string
  /** Capture date and time, formatted when the page was built. */
  label: string
  changed: string[]
}

/** What zap.ms holds for a post: every version, oldest first. */
export interface PublishedHistory<TMessage = unknown> {
  id: string
  versions: { capturedAt: string; message: TMessage }[]
}

export type HistoryRequest =
  | { kind: "snapshot"; version: number }
  | { kind: "compare"; from: number; to: number }

export const HISTORY_ANCHOR = "version-history"

// URL-safe slug for an ISO timestamp. We replace `:` and `.` with `-` so the
// slug is filesystem- and URL-safe while remaining humanly readable.
export function slugifyCapturedAt(capturedAt: string): string {
  return capturedAt.replace(/[:.]/g, "-")
}

/**
 * The version a reference names, or null. A reference is a version number,
 * or the capture-time slug that links used before versions were numbered.
 * Two versions can share a capture time; such a slug means the earliest.
 */
export function resolveVersion(
  reference: string | null | undefined,
  entries: Pick<VersionEntry, "number" | "slug">[]
): number | null {
  if (!reference) return null
  if (/^\d{1,4}$/.test(reference)) {
    const number = Number(reference)
    return entries.some((entry) => entry.number === number) ? number : null
  }
  const matches = entries
    .filter((entry) => entry.slug === reference)
    .map((entry) => entry.number)
  return matches.length ? Math.min(...matches) : null
}

/** What the address asks to see, or null when it asks for nothing valid. */
export function readHistoryRequest(
  search: string,
  entries: Pick<VersionEntry, "number" | "slug">[]
): HistoryRequest | null {
  const params = new URLSearchParams(search)
  const from = resolveVersion(params.get("from"), entries)
  const to = resolveVersion(params.get("to"), entries)
  if (from !== null && to !== null && from !== to) {
    return { kind: "compare", from, to }
  }
  const version = resolveVersion(params.get("v"), entries)
  return version === null ? null : { kind: "snapshot", version }
}

/** The address of a post, showing `request` or nothing from its history. */
export function historyHref(
  id: string,
  request: HistoryRequest | null,
  search = ""
): string {
  const params = new URLSearchParams(search)
  for (const name of ["v", "from", "to"]) params.delete(name)
  if (request?.kind === "snapshot") params.set("v", String(request.version))
  if (request?.kind === "compare") {
    params.set("from", String(request.from))
    params.set("to", String(request.to))
  }
  const query = params.toString()
  return `/message/${id}${query ? `?${query}` : ""}#${HISTORY_ANCHOR}`
}

/**
 * Where an address from before this change now lives. Each version and each
 * pair of versions used to be a page of its own:
 * `/message/<id>/v/<slug>` and `/message/<id>/compare/<from>/<to>`.
 */
export function legacyHistoryRedirect(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "").replace(/\.html$/, "")
  const snapshot = /^\/message\/([^/]+)\/v\/([^/]+)$/.exec(path)
  if (snapshot) {
    const [, id, slug] = snapshot
    return `/message/${id}?v=${encodeURIComponent(slug)}#${HISTORY_ANCHOR}`
  }
  const compare = /^\/message\/([^/]+)\/compare\/([^/]+)\/([^/]+)$/.exec(path)
  if (compare) {
    const [, id, from, to] = compare
    return `/message/${id}?from=${encodeURIComponent(
      from
    )}&to=${encodeURIComponent(to)}#${HISTORY_ANCHOR}`
  }
  return null
}

/** The version with this number in what zap.ms returned, if it is there. */
export function versionAt<TMessage>(
  history: PublishedHistory<TMessage>,
  number: number
): { capturedAt: string; message: TMessage } | null {
  return history.versions[number - 1] ?? null
}

/** A history as zap.ms returns it, or null for anything else. */
export function readPublishedHistory<TMessage = unknown>(
  raw: unknown
): PublishedHistory<TMessage> | null {
  if (!raw || typeof raw !== "object") return null
  const { id, versions } = raw as Record<string, unknown>
  if (typeof id !== "string" || !Array.isArray(versions)) return null
  const valid = versions.every(
    (version) =>
      version &&
      typeof version === "object" &&
      typeof (version as Record<string, unknown>).capturedAt === "string" &&
      typeof (version as Record<string, unknown>).message === "object" &&
      (version as Record<string, unknown>).message !== null
  )
  return valid ? (raw as PublishedHistory<TMessage>) : null
}
