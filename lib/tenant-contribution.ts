import { siteConfig } from "@/config/site"

const contribution = siteConfig.tenantContribution

const tenantIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isTenantId(value: string | null | undefined): value is string {
  return !!value && tenantIdPattern.test(value)
}

// Admin consent for the multi-tenant app. The `organizations` authority lets an
// admin of any work tenant sign in, and `.default` consents to exactly the
// permission configured on the app (ServiceMessage.Read.All).
export function getAdminConsentUrl(): string | null {
  if (!contribution.clientId) return null

  const params = new URLSearchParams({
    client_id: contribution.clientId,
    scope: "https://graph.microsoft.com/.default",
    redirect_uri: contribution.redirectUri,
    state: "mc-archive",
  })

  return `https://login.microsoftonline.com/organizations/v2.0/adminconsent?${params.toString()}`
}

function mailto(subject: string, body: string): string {
  return `mailto:${contribution.email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`
}

export const tenantTypeOptions = [
  "Production",
  "Dev / test",
  "Education (EDU)",
  "Government (GCC)",
  "Nonprofit",
  "Entra External ID",
] as const

export type ContributionDetails = {
  tenantTypes: string[]
  products: string
  credit: boolean
  creditName: string
  creditUrl: string
}

export const emptyContributionDetails: ContributionDetails = {
  tenantTypes: [],
  products: "",
  credit: false,
  creditName: "",
  creditUrl: "",
}

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

function describeCredit(details: ContributionDetails): string {
  if (!details.credit || !details.creditName.trim()) {
    return "No, keep me anonymous"
  }

  const url = details.creditUrl.trim()
  return `Yes, as ${details.creditName.trim()}${
    url && isHttpsUrl(url) ? ` (${url})` : ""
  }`
}

function describeDetails(details: ContributionDetails): string {
  return `Tenant type: ${details.tenantTypes.join(", ") || "Not specified"}
Notable licenses or products: ${details.products.trim() || "Not specified"}
Credit me on the site: ${describeCredit(details)}`
}

export const consentEmailSubject = "Message Center Archive tenant contribution"

export function getConsentEmailBody(
  tenantId: string,
  details: ContributionDetails = emptyContributionDetails
): string {
  return `Hi Merill,

I granted admin consent for the ${contribution.appName} app in my tenant.

Tenant ID: ${tenantId}
${describeDetails(details)}

I understand the app can only read Message Center posts (ServiceMessage.Read.All) and that I can remove access at any time by deleting the ${
    contribution.appName
  } enterprise application.`
}

export function getConsentMailto(
  tenantId: string,
  details: ContributionDetails = emptyContributionDetails
): string {
  return mailto(consentEmailSubject, getConsentEmailBody(tenantId, details))
}

export function getOwnAppMailto(): string {
  return mailto(
    `${consentEmailSubject} (own app)`,
    `Hi Merill,

I registered my own app with a federated credential for ${contribution.githubRepository} (branch ${contribution.githubBranch}) and granted it ServiceMessage.Read.All.

Directory (tenant) ID:
Application (client) ID:
Tenant type (optional, e.g. dev/test, EDU, GCC):
Notable licenses or products (optional):
Credit me on the site (optional, your name and an https link, or leave blank to stay anonymous):`
  )
}

export type ContributorCredit = { name: string; url?: string }

export type ContributorCredits = {
  tenants: number
  credits: ContributorCredit[]
}

// Written to the CONTRIBUTOR_CREDITS repository variable by the private
// mc-tenants sync and read at build time. Only people who asked to be credited
// are named; everyone else is counted.
export function getContributorCredits(): ContributorCredits {
  const empty = { tenants: 0, credits: [] }
  const raw = process.env.NEXT_PUBLIC_CONTRIBUTOR_CREDITS

  if (!raw) return empty

  try {
    const parsed = JSON.parse(raw)
    const credits = (Array.isArray(parsed?.credits) ? parsed.credits : [])
      .filter(
        (credit: unknown): credit is ContributorCredit =>
          typeof (credit as ContributorCredit)?.name === "string" &&
          (credit as ContributorCredit).name.trim().length > 0
      )
      .map((credit: ContributorCredit) => ({
        name: credit.name.trim(),
        url:
          typeof credit.url === "string" && isHttpsUrl(credit.url)
            ? credit.url
            : undefined,
      }))
    const tenants = Number.isInteger(parsed?.tenants)
      ? Math.max(parsed.tenants, credits.length)
      : credits.length

    return { tenants, credits }
  } catch {
    return empty
  }
}
