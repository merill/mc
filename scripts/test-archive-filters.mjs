import assert from "node:assert/strict"
import fs from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

// Use the project's compiler so these tests also run on Node 20.
async function loadTypeScriptModule(relativePath) {
  const source = await fs.readFile(
    new URL(relativePath, import.meta.url),
    "utf8"
  )
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  })

  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  )
}

const { getArchiveFilterUrl, readArchiveFilters } = await loadTypeScriptModule(
  "../lib/archive-filters.ts"
)

const defaults = {
  sourceFilter: "all",
  selectedServices: [],
  searchTerm: "",
}

test("an unfiltered URL restores the existing defaults", () => {
  assert.deepEqual(readArchiveFilters(new URLSearchParams()), defaults)
})

test("a Purview bookmark restores the selected service", () => {
  const href = getArchiveFilterUrl(new URL("https://mc.merill.net/"), {
    ...defaults,
    selectedServices: ["Microsoft Purview"],
  })

  assert.equal(href, "/?service=Microsoft+Purview")
  assert.deepEqual(
    readArchiveFilters(new URL(href, "https://mc.merill.net").searchParams),
    { ...defaults, selectedServices: ["Microsoft Purview"] }
  )
})

test("all available services fit the 2,000-character bookmark URL budget", async (t) => {
  const services = JSON.parse(
    await fs.readFile(
      new URL("../@data/table-services.json", import.meta.url),
      "utf8"
    )
  )
  const { siteConfig } = await loadTypeScriptModule("../config/site.ts")
  const baseUrl = new URL("/", siteConfig.url)
  const href = getArchiveFilterUrl(baseUrl, {
    ...defaults,
    sourceFilter: "messageCenter",
    selectedServices: services,
  })
  const url = new URL(href, baseUrl)
  // A conservative compatibility budget, not a universal browser limit.
  const maxUrlLength = 2000

  assert.ok(services.length > 0, "The service catalog must not be empty")
  assert.deepEqual(url.searchParams.getAll("service"), services)
  assert.deepEqual(
    new Set(readArchiveFilters(url.searchParams).selectedServices),
    new Set(services)
  )
  assert.equal(
    readArchiveFilters(url.searchParams).sourceFilter,
    "messageCenter"
  )
  assert.ok(
    url.href.length <= maxUrlLength,
    `All ${services.length} services plus the source filter use ${url.href.length} characters, exceeding the ${maxUrlLength}-character bookmark URL budget`
  )
  t.diagnostic(
    `${services.length} services plus source: ${url.href.length}/${maxUrlLength} URL characters`
  )
})

test("combined filters round-trip encoded names and search text", () => {
  const filters = {
    sourceFilter: "messageCenter",
    selectedServices: [
      "Microsoft Clipchamp ",
      "Microsoft Purview",
      "Service, with + & / # accents \u00e9",
    ],
    searchTerm: "retention + labels & policies #1",
  }
  const currentUrl = new URL(
    "https://mc.merill.net/?utm_source=newsletter#news"
  )
  const href = getArchiveFilterUrl(currentUrl, filters)
  const resultUrl = new URL(href, currentUrl)

  assert.deepEqual(readArchiveFilters(resultUrl.searchParams), filters)
  assert.equal(resultUrl.searchParams.get("utm_source"), "newsletter")
  assert.equal(resultUrl.hash, "#news")
  assert.equal(
    currentUrl.href,
    "https://mc.merill.net/?utm_source=newsletter#news"
  )
})

test("both source filters are restored", () => {
  for (const sourceFilter of ["messageCenter", "roadmap"]) {
    assert.equal(
      readArchiveFilters(new URLSearchParams({ source: sourceFilter }))
        .sourceFilter,
      sourceFilter
    )
  }
})

test("invalid sources and empty or duplicate service values are harmless", () => {
  const filters = readArchiveFilters(
    new URLSearchParams(
      "source=invalid&service=Microsoft+Teams&service=&service=Microsoft+Purview&service=Microsoft+Teams&q="
    )
  )

  assert.deepEqual(filters, {
    ...defaults,
    selectedServices: ["Microsoft Purview", "Microsoft Teams"],
  })
})

test("unknown services remain selected instead of broadening a saved filter", () => {
  assert.deepEqual(
    readArchiveFilters(new URLSearchParams("service=Future+service"))
      .selectedServices,
    ["Future service"]
  )
})

test("changing and clearing filters removes old values but preserves other parameters", () => {
  const currentUrl = new URL(
    "https://mc.merill.net/?service=Microsoft+Teams&service=Exchange&source=roadmap&q=old&utm_source=newsletter#news"
  )
  const updated = getArchiveFilterUrl(currentUrl, {
    ...defaults,
    selectedServices: ["Microsoft Purview"],
  })
  const updatedUrl = new URL(updated, currentUrl)

  assert.deepEqual(updatedUrl.searchParams.getAll("service"), [
    "Microsoft Purview",
  ])
  assert.equal(updatedUrl.searchParams.has("source"), false)
  assert.equal(updatedUrl.searchParams.has("q"), false)
  assert.equal(
    getArchiveFilterUrl(updatedUrl, defaults),
    "/?utm_source=newsletter#news"
  )
})

test("clearing the last filter leaves no empty query string", () => {
  assert.equal(
    getArchiveFilterUrl(
      new URL("https://mc.merill.net/?service=Microsoft+Purview"),
      defaults
    ),
    "/"
  )
})
