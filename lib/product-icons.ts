/**
 * Product icons for services, from public/icons/products.json, which
 * scripts/build-product-icons.mjs writes. The table, the service filter and
 * zap's share cards all read that one file.
 */
import products from "@/public/icons/products.json"

export type ServiceGroup =
  | "m365"
  | "copilot"
  | "security"
  | "power"
  | "dynamics"
  | "windows"
  | "azure"

/** The service filter's headings, in the order they appear. */
export const SERVICE_GROUPS: { id: ServiceGroup; label: string }[] = [
  { id: "m365", label: "Microsoft 365" },
  { id: "copilot", label: "Copilot & AI" },
  { id: "security", label: "Security & identity" },
  { id: "power", label: "Power Platform" },
  { id: "dynamics", label: "Dynamics 365" },
  { id: "windows", label: "Windows & devices" },
  { id: "azure", label: "Azure" },
]

type Entry = { icon: string | null; group: ServiceGroup }
const map = products as Record<string, Entry>

/** The icon's path on the site, or null when the service has none. */
export function serviceIconSrc(service: string): string | null {
  const icon = map[service]?.icon
  return icon ? `/icons/products/${icon}.png` : null
}

/** A service new since the icons were last built falls under Microsoft 365. */
export function serviceGroup(service: string): ServiceGroup {
  return map[service]?.group ?? "m365"
}

/** Two letters for a service with no icon: "Azure Managed Lustre" → "ML". */
export function serviceMonogram(service: string): string {
  const words = service
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter((word) => word && !/^(microsoft|azure|for|the|and|of)$/i.test(word))
  const letters =
    words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)
  return letters.toUpperCase()
}
