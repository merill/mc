#!/usr/bin/env node
/**
 * Build the Pagefind search index for the site.
 *
 * The site is a static export, so search has to run entirely in the browser.
 * Loading every message body into the page is not an option (~30 MB), so we
 * pre-build a Pagefind index instead: Pagefind ships a chunked, WASM-backed
 * index and only fetches the chunks a given query needs.
 *
 * Records are added with `addCustomRecord` (rather than by crawling the built
 * HTML) because the JSON in `@data` already holds the full text, including the
 * expired posts whose bodies never make it into the table payload.
 *
 * Output: `public/pagefind/**` (copied to `out/` by `next build`) and
 * `public/search-manifest.json` with a small build summary.
 */
import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DATA = path.join(ROOT, "@data")
const ARCHIVE_DIR = path.join(DATA, "archive")
const OUTPUT_DIR = path.join(ROOT, "public", "pagefind")
const MANIFEST_PATH = path.join(ROOT, "public", "search-manifest.json")

// Message bodies are occasionally enormous (release notes with tables). Past a
// few thousand words the extra text adds index weight without adding recall.
const MAX_BODY_LENGTH = 12000
const BATCH_SIZE = 75

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"))
  } catch {
    return fallback
  }
}

function stripHtml(value) {
  if (!value) return ""

  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function detail(message, name) {
  const found = message?.Details?.find((item) => item.Name === name)
  return found?.Value == null ? "" : String(found.Value)
}

function scalar(value) {
  return value == null ? "" : String(value)
}

function messageDate(message) {
  return message?.LastModifiedDateTime || message?.StartDateTime || ""
}

function isoDay(value) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}

function displayDate(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  return `${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function buildRecord(message, { source, isArchived }) {
  const id = message.Id
  const summary = stripHtml(detail(message, "Summary"))
  const body = stripHtml(message.Body?.Markdown || message.Body?.Content)
  const services = Array.isArray(message.Services) ? message.Services : []
  const tags = Array.isArray(message.Tags) ? message.Tags : []
  const roadmapIds = detail(message, "RoadmapIds")
  const platforms = detail(message, "Platforms")
  const releasePhase = detail(message, "ReleasePhase")
  const status = detail(message, "Status")
  const date = messageDate(message)
  const day = isoDay(date)

  const content = [
    id,
    message.Title,
    summary,
    services.join(", "),
    tags.join(", "),
    platforms,
    releasePhase,
    status,
    roadmapIds ? `Roadmap ${roadmapIds}` : "",
    body.slice(0, MAX_BODY_LENGTH),
  ]
    .filter(Boolean)
    .join("\n")

  return {
    url: `/message/${id}`,
    content,
    language: "en",
    meta: {
      id,
      title: scalar(message.Title),
      // Pagefind meta values must be scalars, so services travel as a
      // delimited string and are split again in the browser.
      services: services.join("|"),
      date: day,
      lastUpdated: displayDate(date),
      source,
      sourceLabel: source === "roadmap" ? "Microsoft 365 Roadmap" : "Message Center",
      isMajor: message.IsMajorChange ? "true" : "",
      isArchived: isArchived ? "true" : "",
      category: scalar(message.Category),
      releasePhase,
      roadmapId: roadmapIds,
    },
    filters: {
      source: [source],
      service: services.length ? services : ["Unspecified"],
      category: [slugify(message.Category) || "uncategorized"],
      status: [isArchived ? "expired" : "active"],
      major: [message.IsMajorChange ? "yes" : "no"],
      year: [day ? day.slice(0, 4) : "unknown"],
    },
    sort: { date: day },
  }
}

function loadRecords() {
  const active = readJson(path.join(DATA, "messages.json"), []) || []
  const roadmap = readJson(path.join(DATA, "roadmap.json"), []) || []
  const archiveIndex = readJson(path.join(DATA, "messages-archive.json"), []) || []

  const records = []
  const seen = new Set()

  for (const message of active) {
    if (!message?.Id || seen.has(message.Id)) continue
    seen.add(message.Id)
    records.push(buildRecord(message, { source: "messageCenter", isArchived: false }))
  }

  for (const message of roadmap) {
    if (!message?.Id || seen.has(message.Id)) continue
    seen.add(message.Id)
    records.push(buildRecord(message, { source: "roadmap", isArchived: false }))
  }

  // Expired posts: the table only carries their title, so full-text search over
  // the archived bodies is the main capability this index adds.
  let archived = 0
  for (const entry of archiveIndex) {
    if (!entry?.Id || seen.has(entry.Id)) continue
    seen.add(entry.Id)
    const full = readJson(path.join(ARCHIVE_DIR, `${entry.Id}.json`))
    records.push(buildRecord({ ...entry, ...(full || {}) }, { source: "messageCenter", isArchived: true }))
    archived += 1
  }

  return {
    records,
    counts: {
      messageCenter: active.length,
      roadmap: roadmap.length,
      archived,
    },
  }
}

async function main() {
  const { records, counts } = loadRecords()

  await fsp.rm(OUTPUT_DIR, { recursive: true, force: true })

  const pagefind = await import("pagefind")
  const created = await pagefind.createIndex({
    forceLanguage: "en",
    // Message Center ids and version numbers rely on these characters, so they
    // must survive tokenisation (`MC1234567`, `v2.1-preview`).
    includeCharacters: "._-",
    keepIndexUrl: false,
    writePlayground: false,
  })

  if (!created.index || created.errors.length) {
    throw new Error(`Unable to create Pagefind index: ${created.errors.join("; ")}`)
  }

  const index = created.index
  try {
    for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
      const responses = await Promise.all(
        records.slice(offset, offset + BATCH_SIZE).map((record) => index.addCustomRecord(record))
      )
      const errors = responses.flatMap((response) => response.errors || [])
      if (errors.length) {
        throw new Error(`Unable to add Pagefind records: ${errors.join("; ")}`)
      }
    }

    const written = await index.writeFiles({ outputPath: OUTPUT_DIR })
    if (written.errors.length) {
      throw new Error(`Unable to write Pagefind index: ${written.errors.join("; ")}`)
    }
  } finally {
    await index.deleteIndex()
    await pagefind.close()
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    records: records.length,
    ...counts,
  }
  await fsp.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(
    `[search] indexed ${manifest.records} posts (${counts.messageCenter} active, ${counts.archived} expired, ${counts.roadmap} roadmap).`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
