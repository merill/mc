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

const optionalDetails = `Tenant type (optional, e.g. EDU, GCC, dev/test, notable licenses):
Credit me on the site (optional, leave blank to stay anonymous):`

export function getConsentEmailBody(tenantId: string): string {
  return `Hi Merill,

I granted admin consent for the ${contribution.appName} app in my tenant.

Tenant ID: ${tenantId}
${optionalDetails}

I understand the app can only read Message Center posts (ServiceMessage.Read.All) and that I can remove access at any time by deleting the ${contribution.appName} enterprise application.`
}

export function getConsentMailto(tenantId: string): string {
  return mailto(
    "Message Center Archive tenant contribution",
    getConsentEmailBody(tenantId)
  )
}

export function getOwnAppMailto(): string {
  return mailto(
    "Message Center Archive tenant contribution (own app)",
    `Hi Merill,

I registered my own app with a federated credential for ${contribution.githubRepository} (branch ${contribution.githubBranch}) and granted it ServiceMessage.Read.All.

Directory (tenant) ID:
Application (client) ID:
${optionalDetails}`
  )
}
