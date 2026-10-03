export interface ArchiveFilters {
  sourceFilter: "all" | "messageCenter" | "roadmap"
  selectedServices: string[]
  searchTerm: string
}

export function readArchiveFilters(params: URLSearchParams): ArchiveFilters {
  const source = params.get("source")

  return {
    sourceFilter:
      source === "messageCenter" || source === "roadmap" ? source : "all",
    selectedServices: Array.from(
      new Set(params.getAll("service").filter(Boolean))
    ).sort((a, b) => a.localeCompare(b)),
    searchTerm: params.get("q") ?? "",
  }
}

export function getArchiveFilterUrl(
  currentUrl: URL,
  filters: ArchiveFilters
): string {
  const url = new URL(currentUrl.href)

  url.searchParams.delete("source")
  url.searchParams.delete("service")
  url.searchParams.delete("q")

  if (filters.sourceFilter !== "all") {
    url.searchParams.set("source", filters.sourceFilter)
  }

  for (const service of filters.selectedServices) {
    url.searchParams.append("service", service)
  }

  if (filters.searchTerm) {
    url.searchParams.set("q", filters.searchTerm)
  }

  return `${url.pathname}${url.search}${url.hash}`
}
