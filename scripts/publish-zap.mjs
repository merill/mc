/**
 * Push changed Message Center and Roadmap index records to the discussion
 * service so each post has a thread to attach likes and comments to.
 *
 * Runs at the end of the data refresh, before the commit. "Changed" means a
 * record that is new or whose title or last-modified time differs from the
 * committed `@data/messages-index.json`. Records from a batch that failed to
 * send are remembered in `@data/zap-pending.json` and retried on the next run.
 *
 * The receiving endpoint is idempotent, so sending a record twice is harmless.
 * This script never fails the data refresh: it logs and exits 0.
 *
 * Usage: node scripts/publish-zap.mjs [--all] [--dry-run]
 * Environment: ZAP_INGEST_URL, ZAP_INGEST_TOKEN
 */
import { execFile } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { promisify } from "node:util"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const INDEX_PATH = path.join(ROOT, "@data", "messages-index.json")
const PENDING_PATH = path.join(ROOT, "@data", "zap-pending.json")
const INDEX_GIT_PATH = "@data/messages-index.json"

export const BATCH_SIZE = 200
const SENT_FIELDS = [
  "Id",
  "Title",
  "Source",
  "Url",
  "Services",
  "StartDateTime",
  "EndDateTime",
  "LastModifiedDateTime",
  "IsMajorChange",
  "Category",
  "Tags",
  "Summary"
]

/** Records that are new, retitled or modified since `previous`, plus any pending ids. */
export function selectChanged(current, previous, pendingIds = []) {
  const before = new Map(previous.map(record => [record.Id, record]))
  const pending = new Set(pendingIds)
  return current.filter(record => {
    if (pending.has(record.Id)) return true
    const old = before.get(record.Id)
    return !old || old.LastModifiedDateTime !== record.LastModifiedDateTime || old.Title !== record.Title
  })
}

export function toBatches(records, size = BATCH_SIZE) {
  const batches = []
  for (let index = 0; index < records.length; index += size) {
    batches.push(records.slice(index, index + size))
  }
  return batches
}

/** Only the fields the receiver stores; cross-reference lists stay behind. */
export function toPayload(records) {
  return {
    records: records.map(record => Object.fromEntries(SENT_FIELDS.map(field => [field, record[field] ?? null])))
  }
}

export function validateIngestUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error("ZAP_INGEST_URL is not a valid URL")
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1"
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("ZAP_INGEST_URL must be an HTTPS URL")
  }
  return url
}

/** Sends one batch, retrying on network errors, 429 and 5xx. */
export async function sendBatch(batch, options) {
  const { url, token, fetchImpl = global.fetch, sleep = wait, maximumAttempts = 3 } = options
  let lastError
  for (let attempt = 0; attempt < maximumAttempts; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** attempt)
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(toPayload(batch))
      })
      if (response.ok) return await response.json().catch(() => ({}))
      lastError = new Error(`HTTP ${response.status}`)
      if (response.status !== 429 && response.status < 500) break
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

/**
 * Sends `records` in batches. Returns totals and the ids of records whose
 * batch could not be delivered.
 */
export async function publishRecords(records, options) {
  const totals = { sent: 0, upserted: 0, storiesCreated: 0, skipped: 0, failedIds: [] }
  for (const [index, batch] of toBatches(records).entries()) {
    try {
      const result = await sendBatch(batch, options)
      totals.sent += batch.length
      totals.upserted += result.upserted ?? 0
      totals.storiesCreated += result.storiesCreated ?? 0
      totals.skipped += result.skipped ?? 0
    } catch (error) {
      console.error(`[zap] batch ${index + 1} (${batch.length} records) failed: ${error.message}`)
      totals.failedIds.push(...batch.map(record => record.Id))
    }
  }
  return totals
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"))
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`[zap] unable to read ${filePath}: ${error.message}`)
    return fallback
  }
}

async function readCommittedIndex() {
  try {
    const { stdout } = await promisify(execFile)("git", ["show", `HEAD:${INDEX_GIT_PATH}`], {
      cwd: ROOT,
      maxBuffer: 256 * 1024 * 1024
    })
    return JSON.parse(stdout)
  } catch (error) {
    console.warn(`[zap] no committed index to compare against (${error.message.split("\n")[0]}); sending every record`)
    return []
  }
}

async function savePending(ids, hadPending) {
  if (ids.length === 0 && !hadPending) return
  await fs.writeFile(PENDING_PATH, `${JSON.stringify(ids, null, 2)}\n`)
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const all = args.has("--all")
  const dryRun = args.has("--dry-run")
  const ingestUrl = process.env.ZAP_INGEST_URL ?? ""
  const token = process.env.ZAP_INGEST_TOKEN ?? ""

  const current = await readJson(INDEX_PATH, [])
  const pendingIds = await readJson(PENDING_PATH, [])
  const selected = all ? current : selectChanged(current, await readCommittedIndex(), pendingIds)
  const batchCount = toBatches(selected).length
  console.log(`[zap] ${selected.length} of ${current.length} records to send in ${batchCount} batch(es)`)

  if (dryRun) {
    console.log("[zap] dry run: nothing sent")
    return
  }
  if (!ingestUrl || !token) {
    console.log("[zap] ZAP_INGEST_URL or ZAP_INGEST_TOKEN not set; nothing sent")
    return
  }
  if (selected.length === 0) return

  const totals = await publishRecords(selected, { url: validateIngestUrl(ingestUrl), token })
  await savePending(totals.failedIds, pendingIds.length > 0)
  console.log(
    `[zap] sent ${totals.sent}: ${totals.upserted} updated, ${totals.storiesCreated} threads created, ` +
      `${totals.skipped} skipped, ${totals.failedIds.length} failed and queued for the next run`
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main()
  } catch (error) {
    // Never fail the data refresh because the discussion service is unreachable.
    console.error(`[zap] publisher did not complete: ${error.message}`)
  }
}
