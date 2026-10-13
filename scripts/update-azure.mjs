#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Mirror Azure updates (https://azure.microsoft.com/updates) into `@data`.
 *
 * Microsoft publishes them through a public JSON API, 100 to a page. The first
 * run reads all of it (about ten thousand updates back to 2013, a little over
 * a minute). Later runs ask only for what changed since shortly before the
 * newest update already stored.
 *
 * Writes:
 *   @data/azure/<Id>.json   one file per update, in the shape the site uses
 *                           for every post. Rewritten only when it changed.
 *   @data/azure.json        the updates changed in the last year, newest
 *                           first: the ones the home page loads up front and
 *                           the ones tracked for version history.
 *   @data/azure-index.json  one index record per update, for
 *                           `@build/Update-Site.ps1` to merge into
 *                           `messages-index.json` and `messages-archive.json`.
 *                           Not committed.
 *
 * Ids: `AZ574430` for an update Microsoft numbers. Updates from before
 * November 2024 only have a slug there, so they become `AZ-<slug>`.
 *
 * A failed fetch is not fatal: the files are rebuilt from what is stored and
 * the next run catches up.
 *
 * Usage: node scripts/update-azure.mjs [--full]
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DATA = path.join(ROOT, "@data")
const ITEM_DIR = path.join(DATA, "azure")
const RECENT_PATH = path.join(DATA, "azure.json")
const INDEX_PATH = path.join(DATA, "azure-index.json")

export const API_URL = "https://www.microsoft.com/releasecommunications/api/v2/azure"
export const PAGE_SIZE = 100
// How far back the home page and version tracking reach.
export const RECENT_DAYS = 365
// Each run asks again for this long before the newest stored change, in case
// an update was still being written when the last run read it.
const OVERLAP_DAYS = 7
const SITE_URL = "https://mc.merill.net"
const AZURE_ORIGIN = "https://azure.microsoft.com"
const USER_AGENT = "mc.merill.net archive (+https://mc.merill.net/about)"
const SUMMARY_LENGTH = 500

/** Our id for one of Microsoft's, or null for one we cannot use in a path. */
export function toAzureId(sourceId) {
  const id = String(sourceId ?? "").trim()
  if (/^\d{1,12}$/.test(id)) return `AZ${id}`
  return /^[a-z0-9-]{1,200}$/.test(id) ? `AZ-${id}` : null
}

/** Microsoft's own id back from ours. */
export function toSourceId(id) {
  return id.replace(/^AZ-?/, "")
}

export const azureLink = sourceId => `${AZURE_ORIGIN}/updates?id=${encodeURIComponent(sourceId)}`

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

// What a description may contain. Anything else loses its tag and keeps its
// text, so an unknown element can never bring behaviour or styling with it.
const KEPT_TAGS = new Set([
  "p", "br", "div", "span", "a", "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "sup", "sub",
  "code", "pre", "samp", "tt", "blockquote", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody",
  "tfoot", "tr", "th", "td", "caption", "colgroup", "col", "img", "hr", "wbr", "figure", "figcaption",
  "section", "article", "small"
])
// The page already has its one <h1>. <ins> and <del> are how this site marks
// a comparison, so in a description they would read as a change.
const RENAMED_TAGS = { h1: "h2", del: "s", strike: "s" }
// Removed along with everything inside them.
const DROPPED_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "svg", "title", "noscript", "template", "form"])
const KEPT_ATTRIBUTES = new Set(["href", "src", "alt", "title", "colspan", "rowspan", "start", "scope"])

/**
 * A description as the site may show it. Microsoft writes these, but older
 * ones carry pasted styling (fixed colours that vanish in dark mode), <style>
 * blocks and the odd inline event handler, and the site injects the result
 * into its pages as HTML.
 */
export function sanitizeHtml(html) {
  const source = String(html ?? "").replace(/<!--[\s\S]*?-->/g, "")
  let out = ""
  let last = 0
  // The dropped element we are inside, if any, and how deeply it is nested.
  let dropping = null
  let depth = 0

  for (const match of source.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9:]*)\b([^<>]*)>/g)) {
    const [whole, closing, rawName, attributes] = match
    if (!dropping) out += source.slice(last, match.index)
    last = match.index + whole.length
    const name = rawName.toLowerCase()

    if (dropping) {
      if (name === dropping) depth += closing ? -1 : attributes.trimEnd().endsWith("/") ? 0 : 1
      if (depth === 0) dropping = null
      continue
    }
    if (DROPPED_WITH_CONTENT.has(name)) {
      if (!closing && !attributes.trimEnd().endsWith("/")) {
        dropping = name
        depth = 1
      }
      continue
    }

    const tag = RENAMED_TAGS[name] ?? name
    if (!KEPT_TAGS.has(tag)) continue
    out += closing ? `</${tag}>` : `<${tag}${keptAttributes(tag, attributes)}>`
  }
  return dropping ? out : out + source.slice(last)
}

function keptAttributes(tag, attributes) {
  let out = ""
  for (const [, rawName, double, single, bare] of attributes.matchAll(
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  )) {
    const name = rawName.toLowerCase()
    if (!KEPT_ATTRIBUTES.has(name)) continue
    let value = double ?? single ?? bare ?? ""
    if (name === "href" || name === "src") {
      value = safeUrl(value)
      if (!value) continue
    }
    out += ` ${name}="${value.replace(/"/g, "&quot;")}"`
  }
  if (tag === "a" && out.includes(" href=")) out += ' target="_blank" rel="noopener"'
  return out
}

/** An http(s) or mailto address, with site-relative ones made absolute; else "". */
function safeUrl(value) {
  const url = value.trim()
  if (/^(https?:|mailto:)/i.test(url)) return url
  if (url.startsWith("//")) return `https:${url}`
  if (url.startsWith("/")) return `${AZURE_ORIGIN}${url}`
  return ""
}

const NAMED_ENTITIES = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", rsquo: "’", lsquo: "‘", rdquo: "”",
  ldquo: "“", ndash: "–", mdash: "—", hellip: "…", reg: "®", trade: "™", copy: "©", bull: "•",
  middot: "·", deg: "°", times: "×", eacute: "é", uuml: "ü", ouml: "ö", auml: "ä"
}

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body) => {
    if (body[0] !== "#") return NAMED_ENTITIES[body.toLowerCase()] ?? whole
    const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
  })
}

/** The words of a description, one paragraph per line. */
export function toPlainText(html) {
  const text = String(html ?? "")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
  return decodeEntities(text)
    .split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
}

function limitText(value, maximum = SUMMARY_LENGTH) {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim()
  return clean.length <= maximum ? clean : `${clean.slice(0, maximum).trim()}...`
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

const toIso = value => {
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

const cleanList = values => [...new Set((Array.isArray(values) ? values : []).map(value => String(value).trim()).filter(Boolean))]

/** "General Availability: October 2026; Preview: May 2026", as Microsoft lists them. */
function describeAvailability(availabilities) {
  return cleanList(
    (Array.isArray(availabilities) ? availabilities : []).map(({ ring, month, year } = {}) =>
      ring ? [`${ring}:`, month, year].filter(Boolean).join(" ") : ""
    )
  ).join("; ")
}

/**
 * One update in the shape the site uses for every post, or null when it has
 * no usable id, title or date. Products stand in for services, which is what
 * the list filters on.
 */
export function toMessage(update) {
  const id = toAzureId(update?.id)
  const title = String(update?.title ?? "").replace(/\s+/g, " ").trim()
  const created = toIso(update?.created)
  if (!id || !title || !created) return null

  const sourceId = String(update.id).trim()
  const content = sanitizeHtml(update.description)
  const details = [
    ["SourceId", sourceId],
    ["AzureLink", azureLink(sourceId)],
    ["Status", update.status],
    ["ReleasePhase", cleanList((update.availabilities ?? []).map(item => item?.ring)).join(", ")],
    ["Availability", describeAvailability(update.availabilities)],
    ["ProductCategories", cleanList(update.productCategories).join(", ")]
  ]

  return {
    Id: id,
    Title: title,
    Source: "azure",
    Category: "azure",
    Severity: "normal",
    IsMajorChange: false,
    StartDateTime: created,
    LastModifiedDateTime: toIso(update.modified) ?? created,
    EndDateTime: null,
    ActionRequiredByDateTime: null,
    Services: cleanList(update.products),
    Tags: cleanList(update.tags),
    Body: { ContentType: "html", Content: content, Markdown: toPlainText(content) },
    Details: details.filter(([, value]) => value).map(([Name, Value]) => ({ Name, Value: String(Value) }))
  }
}

/** The record `messages-index.json` carries for a post. */
export function toIndexRecord(message) {
  return {
    Id: message.Id,
    Title: message.Title,
    Source: "azure",
    Url: `${SITE_URL}/message/${message.Id}`,
    Services: message.Services,
    StartDateTime: message.StartDateTime,
    EndDateTime: null,
    LastModifiedDateTime: message.LastModifiedDateTime,
    IsMajorChange: false,
    Category: message.Category,
    Tags: message.Tags,
    Summary: limitText(message.Body?.Markdown)
  }
}

const modifiedAt = message => Date.parse(message.LastModifiedDateTime) || 0

/** Newest change first; the id settles ties so the output is stable. */
export const byNewest = (a, b) => modifiedAt(b) - modifiedAt(a) || a.Id.localeCompare(b.Id)

export function isRecent(message, now = Date.now()) {
  return now - modifiedAt(message) < RECENT_DAYS * 86_400_000
}

/** The moment to ask for changes since, or null to read everything. */
export function fetchSince(messages) {
  const newest = Math.max(0, ...messages.map(modifiedAt))
  return newest ? new Date(newest - OVERLAP_DAYS * 86_400_000).toISOString() : null
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

function pageUrl(skip, since) {
  // A full read goes oldest first, so an update published while it runs lands
  // on the last page instead of moving every page along by one.
  const query = {
    $top: PAGE_SIZE,
    $skip: skip,
    $orderby: since ? "modified desc" : "created asc",
    ...(since ? { $filter: `modified gt ${since}` } : {})
  }
  const text = Object.entries(query).map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("&")
  return `${API_URL}?${text}`
}

async function fetchPage(url, { fetchImpl, sleep, maximumAttempts = 4 }) {
  let lastError
  for (let attempt = 0; attempt < maximumAttempts; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** attempt)
    try {
      const response = await fetchImpl(url, {
        headers: { accept: "application/json", "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(60_000)
      })
      if (response.ok) {
        const body = await response.json()
        if (Array.isArray(body?.value)) return body.value
        lastError = new Error("unexpected response shape")
        break
      }
      lastError = new Error(`HTTP ${response.status}`)
      if (response.status !== 429 && response.status < 500) break
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

/** Every update changed since `since`, or every update when it is null. */
export async function fetchUpdates({ since = null, fetchImpl = global.fetch, sleep = wait, maximumPages = 500 } = {}) {
  const updates = []
  for (let page = 0; page < maximumPages; page++) {
    const batch = await fetchPage(pageUrl(page * PAGE_SIZE, since), { fetchImpl, sleep })
    updates.push(...batch)
    if (batch.length < PAGE_SIZE) return updates
  }
  throw new Error(`more than ${maximumPages} pages; stopping`)
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const serialize = value => `${JSON.stringify(value, null, 2)}\n`

async function readStored() {
  const stored = new Map()
  const files = await fs.readdir(ITEM_DIR).catch(() => [])
  await Promise.all(
    files
      .filter(file => file.endsWith(".json"))
      .map(async file => {
        try {
          const message = JSON.parse(await fs.readFile(path.join(ITEM_DIR, file), "utf8"))
          if (message?.Id) stored.set(message.Id, message)
        } catch (error) {
          console.warn(`[azure] unable to read ${file}: ${error.message}`)
        }
      })
  )
  return stored
}

/** Lays fetched updates over what is stored. Returns the ids that changed. */
export function mergeUpdates(stored, updates) {
  const changed = []
  let skipped = 0
  for (const update of updates) {
    const message = toMessage(update)
    if (!message) {
      skipped++
      continue
    }
    const before = stored.get(message.Id)
    if (before && serialize(before) === serialize(message)) continue
    stored.set(message.Id, message)
    changed.push(message.Id)
  }
  return { changed, skipped }
}

async function main() {
  const full = process.argv.includes("--full")
  await fs.mkdir(ITEM_DIR, { recursive: true })
  const stored = await readStored()
  const since = full ? null : fetchSince([...stored.values()])

  try {
    const updates = await fetchUpdates({ since })
    const { changed, skipped } = mergeUpdates(stored, updates)
    await Promise.all(changed.map(id => fs.writeFile(path.join(ITEM_DIR, `${id}.json`), serialize(stored.get(id)))))
    console.log(
      `[azure] read ${updates.length} update(s) ${since ? `changed since ${since}` : "(everything)"}: ` +
        `${changed.length} new or changed, ${skipped} skipped`
    )
  } catch (error) {
    console.warn(`[azure] fetch did not complete (${error.message}); keeping the ${stored.size} update(s) already stored`)
  }

  const all = [...stored.values()].sort(byNewest)
  const recent = all.filter(message => isRecent(message))
  await fs.writeFile(RECENT_PATH, serialize(recent))
  await fs.writeFile(INDEX_PATH, `${JSON.stringify(all.map(toIndexRecord))}\n`)
  console.log(`[azure] ${all.length} update(s) stored, ${recent.length} changed in the last ${RECENT_DAYS} days`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
