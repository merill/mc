import { Metadata } from "next"

import { siteConfig } from "@/config/site"
import { ConsentResult } from "@/components/consent-result"

export const metadata: Metadata = {
  title: "Tenant connected",
  description:
    "Finish contributing your tenant's Message Center posts to the archive.",
  alternates: {
    canonical: "/connect",
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function ConnectPage() {
  return (
    <section className="page-shell">
      <div className="page-intro">
        <h1 className="page-title">Contribute your tenant</h1>
        <p className="page-description">
          Microsoft sends you here after you review the admin consent prompt for
          the {siteConfig.tenantContribution.appName} app.
        </p>
      </div>
      <ConsentResult />
    </section>
  )
}
