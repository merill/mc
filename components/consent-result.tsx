"use client"

import * as React from "react"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import {
  consentEmailSubject,
  emptyContributionDetails,
  getConsentEmailBody,
  getConsentMailto,
  isHttpsUrl,
  isTenantId,
  tenantTypeOptions,
  type ContributionDetails,
} from "@/lib/tenant-contribution"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type ConsentState =
  | { status: "loading" }
  | { status: "granted"; tenantId: string }
  | { status: "error"; error: string; description: string }
  | { status: "none" }

// Microsoft appends the consent outcome to the redirect URI. The page is static,
// so it is read in the browser and never leaves it.
function readConsentState(search: string): ConsentState {
  const params = new URLSearchParams(search)
  const error = params.get("error")

  if (error) {
    return {
      status: "error",
      error,
      description: params.get("error_description") ?? "",
    }
  }

  const tenantId = params.get("tenant")
  if (
    params.get("admin_consent")?.toLowerCase() === "true" &&
    isTenantId(tenantId)
  ) {
    return { status: "granted", tenantId }
  }

  return { status: "none" }
}

export function ConsentResult() {
  const [state, setState] = React.useState<ConsentState>({
    status: "loading",
  })

  React.useEffect(() => {
    setState(readConsentState(window.location.search))
    // Drop the tenant ID from the address bar so it is not kept in history or
    // shared by accident when someone copies the link.
    window.history.replaceState(null, "", window.location.pathname)
  }, [])

  if (state.status === "loading") return null

  if (state.status === "granted") {
    return <ContributionEmail tenantId={state.tenantId} />
  }

  if (state.status === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Consent was not granted</CardTitle>
        </CardHeader>
        <CardContent className="readable-card-content">
          <p>
            Microsoft returned <code>{state.error}</code>
            {state.description ? `: ${state.description}` : "."}
          </p>
          <p>
            Granting an application permission for Microsoft Graph needs a
            Global Administrator or Privileged Role Administrator. If you
            cancelled the prompt, nothing was changed in your tenant. See the{" "}
            <Link className="readable-link" href="/about#contribute">
              step-by-step guide
            </Link>{" "}
            to try again or to use your own app registration instead.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="readable-card-content pt-6">
        <p>
          No consent response was found. Follow the{" "}
          <Link className="readable-link" href="/about#contribute">
            step-by-step guide
          </Link>{" "}
          on the About page to contribute your tenant.
        </p>
      </CardContent>
    </Card>
  )
}

const labelClass = "text-sm font-medium text-foreground"
const checkboxClass =
  "h-4 w-4 shrink-0 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function ContributionEmail({ tenantId }: { tenantId: string }) {
  const [details, setDetails] = React.useState<ContributionDetails>(
    emptyContributionDetails
  )
  const [copied, setCopied] = React.useState(false)

  const update = (changes: Partial<ContributionDetails>) => {
    setDetails((current) => ({ ...current, ...changes }))
    setCopied(false)
  }

  const toggleTenantType = (type: string, checked: boolean) =>
    update({
      tenantTypes: checked
        ? tenantTypeOptions.filter(
            (option) => option === type || details.tenantTypes.includes(option)
          )
        : details.tenantTypes.filter((option) => option !== type),
    })

  const emailBody = getConsentEmailBody(tenantId, details)
  const email = siteConfig.tenantContribution.email
  const creditUrl = details.creditUrl.trim()
  const creditUrlInvalid = creditUrl.length > 0 && !isHttpsUrl(creditUrl)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailBody)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thank you, consent was granted</CardTitle>
      </CardHeader>
      <CardContent className="readable-card-content">
        <p>
          The {siteConfig.tenantContribution.appName} app can now read Message
          Center posts in tenant <code className="break-all">{tenantId}</code>.
          One last step: tell me a little about the tenant, then send me the
          email below so I can verify the connection and add it. Every field is
          optional.
        </p>

        <form
          className="space-y-6 pt-2"
          onSubmit={(event) => event.preventDefault()}
        >
          <fieldset className="space-y-3">
            <legend className={labelClass}>Tenant type</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {tenantTypeOptions.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-3 text-sm text-foreground/85"
                >
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={details.tenantTypes.includes(type)}
                    onChange={(event) =>
                      toggleTenantType(type, event.target.checked)
                    }
                  />
                  {type}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label className={labelClass} htmlFor="contribution-products">
              Notable licenses or products
            </label>
            <Input
              id="contribution-products"
              placeholder="For example Microsoft 365 E5, Copilot, Dynamics 365"
              value={details.products}
              maxLength={200}
              onChange={(event) => update({ products: event.target.value })}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={details.credit}
                onChange={(event) => update({ credit: event.target.checked })}
              />
              Credit me on the About page
            </label>
            {details.credit ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className={labelClass}
                    htmlFor="contribution-credit-name"
                  >
                    Name to show
                  </label>
                  <Input
                    id="contribution-credit-name"
                    placeholder="Your name or organization"
                    value={details.creditName}
                    maxLength={80}
                    onChange={(event) =>
                      update({ creditName: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className={labelClass}
                    htmlFor="contribution-credit-url"
                  >
                    Link (optional)
                  </label>
                  <Input
                    id="contribution-credit-url"
                    type="url"
                    placeholder="https://linkedin.com/in/you"
                    value={details.creditUrl}
                    maxLength={200}
                    aria-invalid={creditUrlInvalid}
                    onChange={(event) =>
                      update({ creditUrl: event.target.value })
                    }
                  />
                  {creditUrlInvalid ? (
                    <p className="text-sm text-destructive">
                      Use a full link starting with https://
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Leave this off to stay anonymous. Your tenant is only counted.
              </p>
            )}
          </div>
        </form>

        <div className="space-y-2 pt-2">
          <p className={labelClass}>Your email</p>
          <div className="rounded-md border bg-muted/40 text-sm">
            <div className="space-y-1 border-b px-4 py-3 text-muted-foreground">
              <div>
                To: <span className="text-foreground">{email}</span>
              </div>
              <div>
                Subject:{" "}
                <span className="text-foreground">{consentEmailSubject}</span>
              </div>
            </div>
            <pre className="whitespace-pre-wrap break-words px-4 py-3 font-sans text-foreground">
              {emailBody}
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href={getConsentMailto(tenantId, details)}>Send the email</a>
          </Button>
          <Button variant="outline" onClick={copyEmail}>
            {copied ? "Copied" : "Copy email text"}
          </Button>
        </div>
        <p>
          <strong>Send the email</strong> opens it in your mail app. If that
          does not work, copy the text and email it to{" "}
          <a className="readable-link" href={`mailto:${email}`}>
            {email}
          </a>
          . I will reply once your tenant is live, usually within a few days.
        </p>
      </CardContent>
    </Card>
  )
}
