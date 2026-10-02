"use client"

import * as React from "react"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import {
  getConsentEmailBody,
  getConsentMailto,
  isTenantId,
} from "@/lib/tenant-contribution"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    setState(readConsentState(window.location.search))
    // Drop the tenant ID from the address bar so it is not kept in history or
    // shared by accident when someone copies the link.
    window.history.replaceState(null, "", window.location.pathname)
  }, [])

  if (state.status === "loading") return null

  if (state.status === "granted") {
    const copyEmail = async () => {
      try {
        await navigator.clipboard.writeText(getConsentEmailBody(state.tenantId))
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
            Center posts in tenant{" "}
            <code className="break-all">{state.tenantId}</code>. One last step:
            send me the email below so I can verify the connection and add your
            tenant.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={getConsentMailto(state.tenantId)}>Send the email</a>
            </Button>
            <Button variant="outline" onClick={copyEmail}>
              {copied ? "Copied" : "Copy email text"}
            </Button>
          </div>
          <p>
            If the button does not open your mail app, copy the text and send it
            to{" "}
            <a
              className="readable-link"
              href={`mailto:${siteConfig.tenantContribution.email}`}
            >
              {siteConfig.tenantContribution.email}
            </a>
            . I will reply once your tenant is live, usually within a few days.
          </p>
        </CardContent>
      </Card>
    )
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
