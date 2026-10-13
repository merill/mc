/**
 * Push changed version histories to the discussion service, which gives them
 * to signed-in visitors of a post's page. The site only builds the list of
 * versions into each page, so a build needs nothing from here.
 *
 * Runs at the end of the data refresh, after `update-history.mjs` and before
 * the commit. "Changed" means a file under `@data/history` that git reports as
 * modified or new, which is what this refresh touched. A history is sent once
 * it has two versions: with one, the page already shows all there is.
 * Histories that could not be sent are remembered in
 * `@data/history-pending.json` and retried on the next run.
 *
 * The receiver keeps the latest copy under the post's id, so sending one twice
 * is harmless. This script never fails the data refresh: it logs and exits 0.
 *
 * Usage: node scripts/publish-history.mjs [--all] [--dry-run]
 * Environment: ZAP_INGEST_URL, ZAP_INGEST_TOKEN, and ZAP_REPUBLISH_ALL=true
 * for `--all` from the workflow's "republish" switch.
 */
import { execFile } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { promisify } from "node:util"

import { validateIngestUrl } from "./publish-zap.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const HISTORY_DIR = path.join(ROOT, "@data", "history")
const PENDING_PATH = path.join(ROOT, "@data", "history-pending.json")
const HISTORY_GIT_PATH = "@data/history"

export const CONCURRENCY = 6
// After this many failures in a row the receiver is taken to be down, and the
// rest wait for the next run instead of each timing out in turn.
export const GIVE_UP_AFTER = 5

const MESSAGE_FIELDS = [
  "Id",
  "Title",
  "Source",
  "Services",
  "Tags",
  "Category",
  "Severity",
  "IsMajorChange",
  "StartDateTime",
  "EndDateTime",
  "LastModifiedDateTime",
  "ActionRequiredByDateTime"
]
// Microsoft reorders this one between fetches; it is never shown.
const SKIPPED_DETAILS = new Set(["FeatureStatusJson"])

/** The post ids behind `git status --porcelain` lines for the history folder. */
export function changedIds(porcelain) {
  const ids = new Set()
  for (const line of porcelain.split("\n")) {
    // "XY path", with the path quoted when it has unusual characters.
    const file = line.slice(3).trim().replace(/^"|"$/g, "")
    const match = /(?:^|\/)@data\/history\/([^/]+)\.json$/.exec(file)
    if (match) ids.add(match[1])
  }
  return [...ids]
}

/**
 * A history as the receiver stores it: every version, oldest first, each with
 * only the fields the viewer shows. Returns null when there is nothing to
 * compare yet.
 */
export function toPublished(history) {
  if (!history?.id || !Array.isArray(history.versions) || history.versions.length < 2) return null
  return {
    id: String(history.id),
    versions: history.versions.map(version => ({
      capturedAt: version.capturedAt,
      message: slimMessage(version.message ?? {})
    }))
  }
}

function slimMessage(message) {
  const slim = Object.fromEntries(MESSAGE_FIELDS.filter(field => message[field] != null).map(field => [field, message[field]]))
  slim.Body = { Content: message.Body?.Content ?? "" }
  slim.Details = (message.Details ?? []).filter(detail => detail?.Name && !SKIPPED_DETAILS.has(detail.Name))
  return slim
}

/** Where one post's history is sent, next to the address index records go to. */
export function historyUrl(ingestUrl, id) {
  return `${String(ingestUrl).replace(/\/+$/, "")}/history/${encodeURIComponent(id)}`
}

/** Sends one history, retrying on network errors, 429 and 5xx. */
export async function sendHistory(published, options) {
  const { url, token, fetchImpl = global.fetch, sleep = wait, maximumAttempts = 3 } = options
  let lastError
  for (let attempt = 0; attempt < maximumAttempts; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** attempt)
    try {
      const response = await fetchImpl(historyUrl(url, published.id), {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(published)
      })
      if (response.ok) return
      lastError = new Error(`HTTP ${response.status}`)
      if (response.status !== 429 && response.status < 500) break
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

/**
 * Sends the histories of `ids`, a few at a time. `read` returns the stored
 * history for an id. Returns how many were sent, how many had nothing to send,
 * and the ids that have to be tried again.
 */
export async function publishHistories(ids, read, options) {
  const totals = { sent: 0, skipped: 0, failedIds: [] }
  const queue = [...ids]
  let failuresInARow = 0

  async function worker() {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      if (failuresInARow >= GIVE_UP_AFTER) {
        totals.failedIds.push(id)
        continue
      }
      const published = toPublished(await read(id))
      if (!published) {
        totals.skipped++
        continue
      }
      try {
        await sendHistory(published, options)
        totals.sent++
        failuresInARow = 0
      } catch (error) {
        failuresInARow++
        totals.failedIds.push(id)
        if (failuresInARow <= GIVE_UP_AFTER) console.error(`[history] ${id} failed: ${error.message}`)
        if (failuresInARow === GIVE_UP_AFTER) console.error("[history] giving up for this run; the rest are queued")
      }
    }
  }

  await Promise.all(Array.from({ length: options.concurrency ?? CONCURRENCY }, worker))
  return totals
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"))
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`[history] unable to read ${filePath}: ${error.message}`)
    return fallback
  }
}

const readHistory = id => readJson(path.join(HISTORY_DIR, `${id}.json`), null)

async function allIds() {
  const files = await fs.readdir(HISTORY_DIR).catch(() => [])
  return files.filter(file => file.endsWith(".json")).map(file => file.slice(0, -5))
}

async function idsChangedSinceCommit() {
  try {
    const { stdout } = await promisify(execFile)(
      "git",
      ["status", "--porcelain", "--untracked-files=all", "--", HISTORY_GIT_PATH],
      { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }
    )
    return changedIds(stdout)
  } catch (error) {
    console.warn(`[history] unable to ask git what changed (${error.message.split("\n")[0]})`)
    return []
  }
}

async function savePending(ids, hadPending) {
  if (ids.length === 0 && !hadPending) return
  await fs.writeFile(PENDING_PATH, `${JSON.stringify(ids, null, 2)}\n`)
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const all = args.has("--all") || process.env.ZAP_REPUBLISH_ALL === "true"
  const dryRun = args.has("--dry-run")
  const ingestUrl = process.env.ZAP_INGEST_URL ?? ""
  const token = process.env.ZAP_INGEST_TOKEN ?? ""

  const pendingIds = await readJson(PENDING_PATH, [])
  const ids = all ? await allIds() : [...new Set([...(await idsChangedSinceCommit()), ...pendingIds])]
  console.log(`[history] ${ids.length} histor${ids.length === 1 ? "y" : "ies"} to look at`)

  if (dryRun) {
    console.log("[history] dry run: nothing sent")
    return
  }
  if (!ingestUrl || !token) {
    console.log("[history] ZAP_INGEST_URL or ZAP_INGEST_TOKEN not set; nothing sent")
    return
  }
  if (ids.length === 0) return

  const totals = await publishHistories(ids, readHistory, { url: validateIngestUrl(ingestUrl), token })
  await savePending(totals.failedIds, pendingIds.length > 0)
  console.log(
    `[history] sent ${totals.sent}, ${totals.skipped} with a single version left alone, ` +
      `${totals.failedIds.length} failed and queued for the next run`
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main()
  } catch (error) {
    // Never fail the data refresh because the discussion service is unreachable.
    console.error(`[history] publisher did not complete: ${error.message}`)
  }
}
