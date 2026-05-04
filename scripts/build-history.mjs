#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Backfill per-message version history by walking the git history of
 * `@data/messages.json` (and `@data/roadmap.json` for completeness).
 *
 * For each commit, we parse the JSON, hash the canonical content for every
 * message, and emit a new MessageVersion entry per ID whenever the hash
 * changes. The result is written to `@data/history/<Id>.json`.
 *
 * This is a one-time script. It is committed and not part of the daily
 * automation. Re-running it overwrites the history files.
 */

import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const HISTORY_DIR = path.join(ROOT, "@data", "history")
const TARGET_FILES = ["@data/messages.json", "@data/roadmap.json"]

function git(args, opts = {}) {
  const res = spawnSync("git", args, {
    encoding: opts.encoding ?? "utf8",
    maxBuffer: 1024 * 1024 * 256,
    ...opts,
  })
  if (res.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${res.stderr?.toString() ?? ""}`
    )
  }
  return res.stdout
}

function listCommits(filePath) {
  const out = git([
    "log",
    "--all",
    "--reverse",
    "--pretty=format:%H\t%aI",
    "--",
    filePath,
  ])
  return out
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, isoDate] = line.split("\t")
      return { sha, isoDate }
    })
}

function showFileAtCommit(sha, filePath) {
  // Use buffer to avoid extra string copies.
  const res = spawnSync("git", ["show", `${sha}:${filePath}`], {
    maxBuffer: 1024 * 1024 * 256,
  })
  if (res.status !== 0) return null
  return res.stdout.toString("utf8")
}

// Canonical hash over fields that are user-visible and worth tracking.
// We deliberately exclude `FeatureStatusJson` because Microsoft's feed
// reorders its inner array non-deterministically between snapshots, which
// would otherwise produce thousands of phantom versions.
const NOISY_DETAIL_NAMES = new Set(["FeatureStatusJson"])

function canonicalDetails(details) {
  return (details ?? [])
    .filter((d) => d?.Name && !NOISY_DETAIL_NAMES.has(d.Name))
    .map((d) => ({ Name: d.Name ?? "", Value: d.Value ?? "" }))
    .sort((a, b) => a.Name.localeCompare(b.Name))
}

function hashMessage(msg) {
  const canon = {
    Title: msg.Title ?? "",
    Body: msg.Body?.Content ?? "",
    Tags: [...(msg.Tags ?? [])].sort(),
    Services: [...(msg.Services ?? [])].sort(),
    Category: msg.Category ?? "",
    Severity: msg.Severity ?? "",
    IsMajorChange: !!msg.IsMajorChange,
    ActionRequiredByDateTime: msg.ActionRequiredByDateTime ?? null,
    EndDateTime: msg.EndDateTime ?? null,
    StartDateTime: msg.StartDateTime ?? "",
    Details: canonicalDetails(msg.Details),
  }
  return createHash("sha1").update(JSON.stringify(canon)).digest("hex")
}

async function processFile(filePath, perId) {
  console.log(`\n[history] enumerating commits for ${filePath}…`)
  const commits = listCommits(filePath)
  console.log(`[history] ${commits.length} commits found.`)

  let processed = 0
  for (const { sha, isoDate } of commits) {
    processed++
    if (processed % 250 === 0 || processed === commits.length) {
      console.log(`[history]   ${processed}/${commits.length} commits…`)
    }
    const raw = showFileAtCommit(sha, filePath)
    if (!raw) continue
    let arr
    try {
      arr = JSON.parse(raw)
    } catch {
      continue
    }
    if (!Array.isArray(arr)) continue
    for (const msg of arr) {
      if (!msg || typeof msg !== "object" || !msg.Id) continue
      const id = String(msg.Id)
      const hash = hashMessage(msg)
      let entry = perId.get(id)
      if (!entry) {
        entry = { lastHash: null, versions: [] }
        perId.set(id, entry)
      }
      if (entry.lastHash === hash) continue
      const capturedAt = msg.LastModifiedDateTime || isoDate
      entry.versions.push({
        capturedAt,
        source: "git",
        sha,
        message: msg,
      })
      entry.lastHash = hash
    }
  }
}

function readActiveLatestById() {
  // Latest snapshot from the working tree for each active id (from
  // @data/messages.json + @data/roadmap.json) so we can attach an "ingest"
  // version dated at the file's current LastModifiedDateTime in case git
  // history was squashed or the working tree differs from HEAD.
  const map = new Map()
  for (const rel of TARGET_FILES) {
    const full = path.join(ROOT, rel)
    if (!fs.existsSync(full)) continue
    let arr
    try {
      arr = JSON.parse(fs.readFileSync(full, "utf8"))
    } catch {
      continue
    }
    if (!Array.isArray(arr)) continue
    for (const msg of arr) {
      if (!msg?.Id) continue
      map.set(String(msg.Id), msg)
    }
  }
  return map
}

function readArchiveLatestById() {
  // Per-id archive files give us the most recent stored snapshot for ids
  // that have aged out of the live feed.
  const map = new Map()
  const archiveDir = path.join(ROOT, "@data", "archive")
  if (!fs.existsSync(archiveDir)) return map
  for (const entry of fs.readdirSync(archiveDir)) {
    if (!entry.endsWith(".json")) continue
    const id = entry.slice(0, -5)
    const full = path.join(archiveDir, entry)
    let msg
    try {
      msg = JSON.parse(fs.readFileSync(full, "utf8"))
    } catch {
      continue
    }
    if (!msg?.Id) continue
    map.set(String(msg.Id), { msg, mtime: fs.statSync(full).mtime })
  }
  return map
}

async function main() {
  fs.mkdirSync(HISTORY_DIR, { recursive: true })

  /** @type {Map<string, { lastHash: string|null, versions: any[] }>} */
  const perId = new Map()

  for (const f of TARGET_FILES) {
    await processFile(f, perId)
  }

  // Ensure each id has a final entry matching the working tree (if changed).
  const activeLatest = readActiveLatestById()
  for (const [id, msg] of activeLatest) {
    const hash = hashMessage(msg)
    let entry = perId.get(id)
    if (!entry) {
      entry = { lastHash: null, versions: [] }
      perId.set(id, entry)
    }
    if (entry.lastHash !== hash) {
      entry.versions.push({
        capturedAt: msg.LastModifiedDateTime || new Date().toISOString(),
        source: "ingest",
        message: msg,
      })
      entry.lastHash = hash
    }
  }

  // For ids that exist only in archive (not in live feeds), include the
  // archive file as a final snapshot.
  const archiveLatest = readArchiveLatestById()
  for (const [id, { msg, mtime }] of archiveLatest) {
    if (activeLatest.has(id)) continue
    const hash = hashMessage(msg)
    let entry = perId.get(id)
    if (!entry) {
      entry = { lastHash: null, versions: [] }
      perId.set(id, entry)
    }
    if (entry.lastHash !== hash) {
      entry.versions.push({
        capturedAt: msg.LastModifiedDateTime || mtime.toISOString(),
        source: "ingest",
        message: msg,
      })
      entry.lastHash = hash
    }
  }

  console.log(`\n[history] writing ${perId.size} history files…`)
  let totalVersions = 0
  let multi = 0
  for (const [id, entry] of perId) {
    // Sort versions ascending by capturedAt for stability.
    entry.versions.sort(
      (a, b) =>
        new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
    )
    const out = { id, versions: entry.versions }
    fs.writeFileSync(
      path.join(HISTORY_DIR, `${id}.json`),
      JSON.stringify(out, null, 2)
    )
    totalVersions += entry.versions.length
    if (entry.versions.length > 1) multi++
  }
  console.log(
    `[history] done. ${perId.size} ids, ${totalVersions} total versions, ${multi} ids with >1 version.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
