#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Augment `@data/messages-index.json` (and the public copy) with
 * cross-message reference edges:
 *   - `References`: MC ids mentioned in this post's body or summary.
 *   - `ReferencedBy`: MC ids whose body or summary mentions this post.
 *
 * Ids are only emitted if both endpoints exist in the index (i.e. we never
 * record a reference to an unknown id). Helps AI/search consumers walk the
 * relationship graph without re-parsing HTML themselves.
 *
 * Invoked from `@build/Update-Site.ps1` after the index is written.
 */

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const INDEX_DATA = path.join(ROOT, "@data", "messages-index.json")
const INDEX_PUBLIC = path.join(ROOT, "public", "messages-index.json")
const MESSAGES = path.join(ROOT, "@data", "messages.json")
const ROADMAP = path.join(ROOT, "@data", "roadmap.json")
const ARCHIVE_DIR = path.join(ROOT, "@data", "archive")

const MC_RE = /\bMC\d{6,7}\b/g

function tryReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"))
  } catch {
    return null
  }
}

function bodyContent(msg) {
  return msg?.Body?.Content ?? ""
}

function summaryText(msg) {
  return (
    msg?.Details?.find((d) => d?.Name === "Summary")?.Value?.toString() ?? ""
  )
}

function main() {
  const index = tryReadJson(INDEX_DATA)
  if (!Array.isArray(index)) {
    console.error("[references] messages-index.json missing or invalid; skipping.")
    return
  }
  const known = new Set(index.map((r) => r.Id))

  const references = new Map() // from -> Set<to>
  const referencedBy = new Map() // to -> Set<from>

  const addEdge = (from, to) => {
    if (!from || !to || from === to) return
    if (!known.has(to)) return
    if (!references.has(from)) references.set(from, new Set())
    references.get(from).add(to)
    if (!referencedBy.has(to)) referencedBy.set(to, new Set())
    referencedBy.get(to).add(from)
  }

  const scan = (id, text) => {
    if (!text) return
    const m = text.match(MC_RE)
    if (!m) return
    for (const x of m) addEdge(id, x)
  }

  // Active feeds.
  for (const file of [MESSAGES, ROADMAP]) {
    const arr = tryReadJson(file)
    if (!Array.isArray(arr)) continue
    for (const msg of arr) {
      if (!msg?.Id) continue
      scan(msg.Id, bodyContent(msg))
      scan(msg.Id, summaryText(msg))
    }
  }

  // Archive-only ids (those not in active feeds).
  const activeIds = new Set()
  for (const file of [MESSAGES, ROADMAP]) {
    const arr = tryReadJson(file)
    if (!Array.isArray(arr)) continue
    for (const msg of arr) {
      if (msg?.Id) activeIds.add(msg.Id)
    }
  }
  if (fs.existsSync(ARCHIVE_DIR)) {
    for (const f of fs.readdirSync(ARCHIVE_DIR)) {
      if (!f.endsWith(".json")) continue
      const id = f.slice(0, -5)
      if (activeIds.has(id)) continue
      const msg = tryReadJson(path.join(ARCHIVE_DIR, f))
      if (!msg?.Id) continue
      scan(msg.Id, bodyContent(msg))
      scan(msg.Id, summaryText(msg))
    }
  }

  // Sort: highest (newest) ids first.
  const sortDesc = (a, b) =>
    Number(b.replace(/^MC/, "")) - Number(a.replace(/^MC/, ""))

  let withRefs = 0
  let withIncoming = 0
  for (const record of index) {
    const refs = [...(references.get(record.Id) ?? [])].sort(sortDesc)
    const inc = [...(referencedBy.get(record.Id) ?? [])].sort(sortDesc)
    if (refs.length) withRefs++
    if (inc.length) withIncoming++
    if (refs.length) record.References = refs
    if (inc.length) record.ReferencedBy = inc
  }

  fs.writeFileSync(INDEX_DATA, JSON.stringify(index))
  fs.writeFileSync(INDEX_PUBLIC, JSON.stringify(index))

  console.log(
    `[references] augmented messages-index.json: ${withRefs} records with References, ${withIncoming} with ReferencedBy.`
  )
}

main()
