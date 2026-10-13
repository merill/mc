/**
 * A view of the archive list: which posts it shows, in what order, and with
 * which columns. The list always has one in effect; a signed-in visitor can
 * save theirs under a name and switch between them (see `use-views.ts`).
 *
 * The search box is not part of a view: it is what you are looking for right
 * now, on top of whichever view you are in.
 */

export type ViewSource = "all" | "messageCenter" | "roadmap" | "azure"
export type ViewSortColumn = "lastUpdated" | "id" | "title"

export interface ViewSettings {
  source: ViewSource
  /** Only posts for any of these services; empty means every service. */
  services: string[]
  majorOnly: boolean
  hideExpired: boolean
  sort: { id: ViewSortColumn; desc: boolean }
  /** The optional columns that are shown. ID and Title always are. */
  columns: OptionalColumn[]
}

export interface SavedView {
  id: string
  name: string
  settings: ViewSettings
}

export const OPTIONAL_COLUMNS = [
  { id: "source", label: "Source" },
  { id: "service", label: "Service" },
  { id: "lastUpdated", label: "Last updated" },
] as const
export type OptionalColumn = (typeof OPTIONAL_COLUMNS)[number]["id"]

export const SORT_CHOICES: {
  label: string
  sort: ViewSettings["sort"]
}[] = [
  { label: "Newest first", sort: { id: "lastUpdated", desc: true } },
  { label: "Oldest first", sort: { id: "lastUpdated", desc: false } },
  { label: "ID, highest first", sort: { id: "id", desc: true } },
  { label: "ID, lowest first", sort: { id: "id", desc: false } },
  { label: "Title, A to Z", sort: { id: "title", desc: false } },
  { label: "Title, Z to A", sort: { id: "title", desc: true } },
]

/** What the list shows before anyone changes anything. */
export const DEFAULT_VIEW: ViewSettings = {
  source: "all",
  services: [],
  majorOnly: false,
  hideExpired: false,
  sort: { id: "lastUpdated", desc: true },
  columns: ["service", "lastUpdated"],
}

export const VIEWS_MAX = 20
export const VIEW_NAME_MAX = 40

const SOURCES: ViewSource[] = ["all", "messageCenter", "roadmap", "azure"]
const SORT_COLUMNS: ViewSortColumn[] = ["lastUpdated", "id", "title"]

/**
 * Settings from anything stored or sent back, with whatever is missing or
 * unknown replaced by the default. Views saved by an older version of the
 * site, or a newer one, still open.
 */
export function readViewSettings(raw: unknown): ViewSettings {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >
  const sort = (
    value.sort && typeof value.sort === "object" ? value.sort : {}
  ) as Record<string, unknown>
  const known = OPTIONAL_COLUMNS.map((column) => column.id)

  return {
    source: SOURCES.includes(value.source as ViewSource)
      ? (value.source as ViewSource)
      : DEFAULT_VIEW.source,
    services: Array.isArray(value.services)
      ? Array.from(
          new Set(
            value.services.filter(
              (service): service is string =>
                typeof service === "string" && service.length > 0
            )
          )
        ).sort((a, b) => a.localeCompare(b))
      : [],
    majorOnly: value.majorOnly === true,
    hideExpired: value.hideExpired === true,
    sort: SORT_COLUMNS.includes(sort.id as ViewSortColumn)
      ? { id: sort.id as ViewSortColumn, desc: sort.desc !== false }
      : DEFAULT_VIEW.sort,
    columns: Array.isArray(value.columns)
      ? known.filter((id) => (value.columns as unknown[]).includes(id))
      : DEFAULT_VIEW.columns,
  }
}

export function readSavedViews(raw: unknown): SavedView[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const { id, name, settings } = item as Record<string, unknown>
    if (typeof id !== "string" || typeof name !== "string" || !name) return []
    return [{ id, name, settings: readViewSettings(settings) }]
  })
}

export function sameViewSettings(a: ViewSettings, b: ViewSettings): boolean {
  return (
    JSON.stringify(readViewSettings(a)) === JSON.stringify(readViewSettings(b))
  )
}

/** Whether a row belongs in the view, before any search. */
export function inView(
  row: {
    source?: string
    service?: string[]
    isMajor?: boolean
    isArchived?: boolean
  },
  view: ViewSettings
): boolean {
  if (view.source !== "all" && row.source !== view.source) return false
  if (view.majorOnly && !row.isMajor) return false
  if (view.hideExpired && row.isArchived) return false
  if (view.services.length === 0) return true
  const services = row.service ?? []
  return view.services.some((service) => services.includes(service))
}

/** How many things a view narrows the list by, for the badge on its button. */
export function narrowedBy(view: ViewSettings): number {
  return Number(view.majorOnly) + Number(view.hideExpired)
}

/** A name as typed, made fit to keep: one line, single spaces. */
export function cleanViewName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, VIEW_NAME_MAX).trim()
}

/** An id zap.ms will accept: letters, digits, `_` and `-`. */
export function newViewId(random: () => number = Math.random): string {
  return `v${Date.now().toString(36)}${Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, "0")}`
}
