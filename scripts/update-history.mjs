#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Incrementally append new versions to `@data/history/<Id>.json` after a
 * daily ingestion run. For each id present in `@data/messages.json` and
 * `@data/roadmap.json`, hash the current canonical content and, if it
 * differs from the last stored hash, append a new MessageVersion entry.
 *
 * Designed to be invoked by `@build/Update-Site.ps1` after it writes the
 * fresh data files.
 */

import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const HISTORY_DIR = path.join(ROOT, "@data", "history")
const SOURCE_FILES = ["@data/messages.json", "@data/roadmap.json"]

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

function loadJson(rel) {
  const full = path.join(ROOT, rel)
  if (!fs.existsSync(full)) return []
  try {
    const arr = JSON.parse(fs.readFileSync(full, "utf8"))
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function loadHistory(id) {
  const full = path.join(HISTORY_DIR, `${id}.json`)
  if (!fs.existsSync(full)) return { id, versions: [] }
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"))
  } catch {
    return { id, versions: [] }
  }
}

function saveHistory(history) {
  fs.writeFileSync(
    path.join(HISTORY_DIR, `${history.id}.json`),
    JSON.stringify(history, null, 2)
  )
}

function main() {
  fs.mkdirSync(HISTORY_DIR, { recursive: true })
  let appended = 0
  let touchedIds = 0
  for (const rel of SOURCE_FILES) {
    const items = loadJson(rel)
    for (const msg of items) {
      if (!msg?.Id) continue
      const id = String(msg.Id)
      const history = loadHistory(id)
      const lastHash = history.versions.length
        ? hashMessage(history.versions[history.versions.length - 1].message)
        : null
      const newHash = hashMessage(msg)
      if (lastHash === newHash) continue
      history.versions.push({
        capturedAt: msg.LastModifiedDateTime || new Date().toISOString(),
        source: "ingest",
        message: msg,
      })
      saveHistory(history)
      appended++
      touchedIds++
    }
  }
  console.log(
    `[history] ingestion update: appended ${appended} new versions across ${touchedIds} ids.`
  )
}

main()
