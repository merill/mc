/**
 * Formatting and comparison helpers for a message that need nothing but the
 * message itself. They run at build time and in the browser, so this file
 * stays free of imports (`lib/messages.ts` reads from disk and cannot be
 * loaded by a client component). The node test runner loads it directly too.
 */

type Detail = { Name?: string; Value?: string }

type MessageLike = {
  Title?: string
  Body?: { Content?: string }
  Tags?: string[]
  Services?: string[]
  Category?: string
  Severity?: string
  IsMajorChange?: boolean
  ActionRequiredByDateTime?: string | null
  EndDateTime?: string | null
  Details?: Detail[]
}

/**
 * The id to show a reader. Microsoft names Azure updates from before
 * November 2024 with a slug, which says nothing the title does not.
 */
export function getDisplayId(id: string | undefined | null): string {
  if (!id) return ""
  return id.startsWith("AZ-") ? "Azure" : id
}

/** "MC123 - Title", or the title alone when the id is only a slug. */
export function getMessageHeading(
  msg: { Id?: string; Title?: string } | undefined
): string {
  if (!msg?.Id) return msg?.Title ?? ""
  return msg.Id.startsWith("AZ-") ? msg.Title ?? "" : `${msg.Id} - ${msg.Title}`
}

export function getFormattedDate(dateInput: string | undefined | null): string {
  if (!dateInput) return ""
  const date = new Date(dateInput)
  const year = date.getFullYear()
  const month = date.toLocaleString("default", { month: "short" })
  const day = date.getDate()

  return `${month} ${day}, ${year}`
}

export function stripHtml(value: string | undefined | null): string {
  if (!value) return ""

  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export function truncateText(value: string, maxLength = 180): string {
  if (value.length <= maxLength) return value

  const truncated = value.slice(0, maxLength - 1).trimEnd()
  const lastSpace = truncated.lastIndexOf(" ")

  return `${lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated}…`
}

export function getDetailValue(
  msg: MessageLike | undefined,
  name: string
): string {
  return msg?.Details?.find((d) => d.Name === name)?.Value?.toString() ?? ""
}

const sortedList = (values: string[] | undefined) =>
  [...(values ?? [])].sort().join(", ")

// Returns a short label of which top-level fields differ between two
// messages — used for the timeline summary line. Body changes are detected
// by content equality, not diff size.
export function summarizeChanges(
  prev: MessageLike | undefined,
  next: MessageLike
): string[] {
  if (!prev) return ["Initial version"]
  const changed: string[] = []
  if ((prev.Title ?? "") !== (next.Title ?? "")) changed.push("Title")
  if ((prev.Body?.Content ?? "") !== (next.Body?.Content ?? ""))
    changed.push("Body")
  if (sortedList(prev.Tags) !== sortedList(next.Tags)) changed.push("Tags")
  if (sortedList(prev.Services) !== sortedList(next.Services))
    changed.push("Services")
  if ((prev.Category ?? "") !== (next.Category ?? "")) changed.push("Category")
  if ((prev.Severity ?? "") !== (next.Severity ?? "")) changed.push("Severity")
  if (!!prev.IsMajorChange !== !!next.IsMajorChange)
    changed.push("Major change flag")
  if (
    (prev.ActionRequiredByDateTime ?? null) !==
    (next.ActionRequiredByDateTime ?? null)
  )
    changed.push("Act-by date")
  if ((prev.EndDateTime ?? null) !== (next.EndDateTime ?? null))
    changed.push("End date")
  if (getDetailValue(prev, "Status") !== getDetailValue(next, "Status"))
    changed.push("Status")
  if (
    getDetailValue(prev, "ReleasePhase") !== getDetailValue(next, "ReleasePhase")
  )
    changed.push("Release phase")
  if (
    getDetailValue(prev, "Availability") !== getDetailValue(next, "Availability")
  )
    changed.push("Timeline")

  return changed.length ? changed : ["No tracked field changed"]
}

const DETAIL_LABELS: Record<string, string> = {
  Status: "Status",
  ReleasePhase: "Release phase",
  Availability: "Timeline",
  Platforms: "Platforms",
  CloudInstances: "Cloud instances",
}

export interface MetadataChange {
  label: string
  oldValue: string
  newValue: string
}

/** The metadata fields that differ between two versions, old value first. */
export function metadataChanges(
  a: MessageLike,
  b: MessageLike
): MetadataChange[] {
  const rows: MetadataChange[] = [
    { label: "Title", oldValue: a.Title ?? "", newValue: b.Title ?? "" },
    {
      label: "Services",
      oldValue: sortedList(a.Services),
      newValue: sortedList(b.Services),
    },
    { label: "Tags", oldValue: sortedList(a.Tags), newValue: sortedList(b.Tags) },
    {
      label: "Category",
      oldValue: a.Category ?? "",
      newValue: b.Category ?? "",
    },
    {
      label: "Severity",
      oldValue: a.Severity ?? "",
      newValue: b.Severity ?? "",
    },
    {
      label: "Major change",
      oldValue: a.IsMajorChange ? "Yes" : "No",
      newValue: b.IsMajorChange ? "Yes" : "No",
    },
    {
      label: "Action required by",
      oldValue: getFormattedDate(a.ActionRequiredByDateTime),
      newValue: getFormattedDate(b.ActionRequiredByDateTime),
    },
    {
      label: "End date",
      oldValue: getFormattedDate(a.EndDateTime),
      newValue: getFormattedDate(b.EndDateTime),
    },
    ...["Status", "ReleasePhase", "Availability", "Platforms", "CloudInstances"].map(
      (name) => ({
        label: DETAIL_LABELS[name],
        oldValue: getDetailValue(a, name),
        newValue: getDetailValue(b, name),
      })
    ),
  ]

  return rows.filter((row) => row.oldValue !== row.newValue)
}

const MC_ID_RE = /\bMC\d{6,7}\b/g

// Replace every plain-text MC id (one not already wrapped in an <a> tag)
// with an internal anchor pointing at /message/<id>. We deliberately do not
// touch ids inside an existing <a>...</a> so as not to override links the
// upstream feed already provides (e.g. admin.microsoft.com deep links).
//
// The scanner is HTML-aware enough to distinguish anchor scope without a
// real parser: it tracks an <a> nesting depth and skips id replacement
// while depth > 0. Tag attributes are also skipped because we only replace
// inside text-node regions.
//
// `isKnown` decides which ids have a page here, so no link is ever dead.
export function linkifyIds(
  html: string | undefined | null,
  isKnown: (id: string) => boolean,
  currentId?: string
): string {
  if (!html) return ""
  let out = ""
  let i = 0
  let anchorDepth = 0
  const len = html.length

  while (i < len) {
    const ch = html[i]
    if (ch === "<") {
      // Find the end of the tag.
      const end = html.indexOf(">", i)
      if (end === -1) {
        out += html.slice(i)
        break
      }
      const tag = html.slice(i, end + 1)
      // Detect <a ...>, </a>, ignoring <area>/<address>/etc by checking
      // the character right after the opening "<" or "</".
      const lower = tag.toLowerCase()
      if (/^<a\b/.test(lower)) anchorDepth++
      else if (/^<\/a\s*>/.test(lower)) anchorDepth = Math.max(0, anchorDepth - 1)
      out += tag
      i = end + 1
      continue
    }

    // Text node: read until next "<".
    const next = html.indexOf("<", i)
    const segment = next === -1 ? html.slice(i) : html.slice(i, next)
    if (anchorDepth > 0) {
      out += segment
    } else {
      out += segment.replace(MC_ID_RE, (match) => {
        if (currentId && match === currentId) return match
        if (!isKnown(match)) return match
        return `<a href="/message/${match}" class="mc-ref-link" data-mc-ref="${match}">${match}</a>`
      })
    }
    if (next === -1) break
    i = next
  }

  return out
}
