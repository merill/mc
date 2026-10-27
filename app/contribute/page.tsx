import * as React from "react"
import { Metadata } from "next"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import {
  coveredLicenses,
  getAdminConsentUrl,
  getContributorCredits,
  getLinkLabel,
  getOwnAppMailto,
  wantedLicenses,
} from "@/lib/tenant-contribution"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const description =
  "Let the archive read your tenant's Message Center, read-only, so posts that only some tenants receive are not missed."

export const metadata: Metadata = {
  title: "Contribute your tenant",
  description,
  alternates: {
    canonical: "/contribute",
  },
  openGraph: {
    title: `Contribute your tenant | ${siteConfig.name}`,
    description,
    url: "/contribute",
    images: ["/og-default.png"],
  },
}

const contribution = siteConfig.tenantContribution
const [githubOwner, githubRepo] = contribution.githubRepository.split("/")

/**
 * How to let the archive read a tenant's Message Center. It was a section of
 * the About page until the archive had the coverage it most needed.
 */
export default function ContributePage() {
  const consentUrl = getAdminConsentUrl()
  const ownAppMailto = getOwnAppMailto()
  const { tenants: contributedTenants, credits } = getContributorCredits()
  const anonymousTenants = contributedTenants - credits.length

  return (
    <section className="page-shell">
      <div className="page-intro">
        <h1 className="page-title">Contribute your tenant</h1>
        <p className="page-description">
          Message Center posts differ by tenant. Sharing yours, read-only, fills
          in the posts other tenants never receive.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Help improve tenant coverage</CardTitle>
        </CardHeader>
        <CardContent className="readable-card-content">
          <p>
            Some entries may be missing, especially posts shown only to EDU,
            government, or tenants with additional products and licenses. If you
            manage a tenant (a dev or test tenant is ideal), you can let the
            archive read its Message Center. It takes about five minutes and
            there is no password, secret, or certificate to create or share.
          </p>
          <p>The access is deliberately narrow:</p>
          <ul>
            <li>
              The only permission is the Microsoft Graph application permission{" "}
              <code>ServiceMessage.Read.All</code> (Read service messages). It
              cannot read users, groups, mail, files, sign-ins, or any other
              data, and it cannot change anything in your tenant.
            </li>
            <li>
              The app signs in with workload identity federation: Microsoft
              Entra only issues a token to the scheduled GitHub Actions workflow
              on the <code>{contribution.githubBranch}</code> branch of{" "}
              <Link
                className="readable-link"
                href={`https://github.com/${contribution.githubRepository}`}
              >
                {contribution.githubRepository}
              </Link>
              . No credential exists that could leak.
            </li>
            <li>
              You can remove access at any time by deleting the enterprise
              application in your tenant.
            </li>
          </ul>

          <h2
            id="coverage"
            className="scroll-mt-20 pt-2 text-xl font-semibold text-foreground"
          >
            Licenses the archive already covers
          </h2>
          <p>
            Message Center targets posts by license, so another tenant with the
            same licenses adds little. These are already covered:
          </p>
          <ul>
            {coveredLicenses.map((license) => (
              <li key={license}>{license}</li>
            ))}
          </ul>
          <p>
            Tenants with licenses that are not on that list help the most, for
            example:
          </p>
          <ul>
            {wantedLicenses.map((license) => (
              <li key={license}>{license}</li>
            ))}
          </ul>
          <p>
            If your tenant has something else not listed above, please share it
            too.
          </p>

          {contributedTenants > 0 ? (
            <>
              <h2
                id="contributors"
                className="scroll-mt-20 pt-2 text-xl font-semibold text-foreground"
              >
                Thank you, contributors
              </h2>
              <p>
                {credits.length > 0 ? (
                  <>
                    Thanks to{" "}
                    {credits.map((credit, index) => (
                      <React.Fragment key={`${credit.name}-${index}`}>
                        {index > 0
                          ? index === credits.length - 1 &&
                            anonymousTenants === 0
                            ? " and "
                            : ", "
                          : null}
                        {credit.url ? (
                          <a
                            className="readable-link"
                            href={credit.url}
                            rel="nofollow noopener noreferrer"
                            target="_blank"
                          >
                            {credit.name}
                          </a>
                        ) : (
                          <strong>{credit.name}</strong>
                        )}
                        {credit.links?.length ? (
                          <>
                            {" ("}
                            {credit.links.map((link, linkIndex) => (
                              <React.Fragment key={link}>
                                {linkIndex > 0 ? ", " : null}
                                <a
                                  className="readable-link"
                                  href={link}
                                  rel="nofollow noopener noreferrer"
                                  target="_blank"
                                >
                                  {getLinkLabel(link)}
                                </a>
                              </React.Fragment>
                            ))}
                            {")"}
                          </>
                        ) : null}
                      </React.Fragment>
                    ))}
                    {anonymousTenants > 0
                      ? `, and ${anonymousTenants} ${
                          anonymousTenants === 1
                            ? "person who prefers"
                            : "people who prefer"
                        } to stay anonymous,`
                      : null}{" "}
                    for sharing their tenant&apos;s Message Center with the
                    archive.
                  </>
                ) : (
                  <>
                    {contributedTenants}{" "}
                    {contributedTenants === 1 ? "tenant is" : "tenants are"}{" "}
                    shared with the archive by people who prefer to stay
                    anonymous. Thank you!
                  </>
                )}
              </p>
            </>
          ) : null}

          <h2 className="pt-2 text-xl font-semibold text-foreground">
            Option 1: one-click admin consent (recommended)
          </h2>
          <p>
            You need a Global Administrator or Privileged Role Administrator
            account, because only those roles can consent to a Microsoft Graph
            application permission. This works for tenants in the commercial
            cloud, including GCC; GCC High, DoD, and other sovereign clouds are
            not supported.
          </p>
          <ol>
            <li>
              Select <strong>Grant read-only access</strong> below and sign in
              with your admin account.
              {consentUrl ? (
                <span className="mt-3 block">
                  <a
                    className={buttonVariants()}
                    href={consentUrl}
                    rel="nofollow"
                  >
                    Grant read-only access
                  </a>
                </span>
              ) : (
                <span className="mt-1 block text-sm text-muted-foreground">
                  The one-click consent link is not available yet. Use option 2
                  or email me and I will send you the link.
                </span>
              )}
            </li>
            <li>
              Check that the prompt names the{" "}
              <strong>{contribution.appName}</strong> app and lists only{" "}
              <strong>Read service messages</strong> as the permission it
              requests, then select <strong>Accept</strong>. This adds a{" "}
              {contribution.appName} enterprise application to your tenant.
            </li>
            <li>
              Microsoft returns you to this site, which shows your tenant ID.
              Add any optional details (tenant type, notable licenses, and
              whether you would like to be credited), check the email it
              prepares, and select <strong>Send the email</strong> or copy it
              and email it to me.
            </li>
            <li>
              I confirm the app can read your Message Center, add your tenant to
              the private list, and reply when it is live. New posts show up
              within a few hours of the next refresh.
            </li>
          </ol>

          <h2 className="pt-2 text-xl font-semibold text-foreground">
            Option 2: use your own app registration
          </h2>
          <p>
            Use this if your organization does not allow apps registered in
            other tenants. You own the app and its federated credential, and can
            remove either at any time. You need an Application Administrator to
            create the app, and a Global Administrator or Privileged Role
            Administrator to grant consent.
          </p>
          <ol>
            <li>
              In the{" "}
              <Link
                className="readable-link"
                href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
              >
                Microsoft Entra admin center
              </Link>
              , go to <strong>Entra ID</strong> &gt;{" "}
              <strong>App registrations</strong> &gt;{" "}
              <strong>New registration</strong>. Enter the name{" "}
              <code>{contribution.appName}</code>, choose{" "}
              <strong>Accounts in this organizational directory only</strong>,
              leave the redirect URI empty, and select <strong>Register</strong>
              .
            </li>
            <li>
              Open <strong>API permissions</strong>. Remove the default{" "}
              <code>User.Read</code> permission, then select{" "}
              <strong>Add a permission</strong> &gt;{" "}
              <strong>Microsoft Graph</strong> &gt;{" "}
              <strong>Application permissions</strong>, tick{" "}
              <code>ServiceMessage.Read.All</code>, and select{" "}
              <strong>Add permissions</strong>. Select{" "}
              <strong>Grant admin consent</strong> and confirm.
            </li>
            <li>
              Open <strong>Certificates &amp; secrets</strong> &gt;{" "}
              <strong>Federated credentials</strong> &gt;{" "}
              <strong>Add credential</strong> and enter:
              <ul className="mt-2">
                <li>
                  Federated credential scenario:{" "}
                  <strong>GitHub Actions deploying Azure resources</strong>
                </li>
                <li>
                  Organization: <code>{githubOwner}</code>
                </li>
                <li>
                  Repository: <code>{githubRepo}</code>
                </li>
                <li>
                  Entity type: <strong>Branch</strong>, GitHub branch name:{" "}
                  <code>{contribution.githubBranch}</code>
                </li>
                <li>
                  Name: <code>mc-archive</code>, and leave the audience as{" "}
                  <code>api://AzureADTokenExchange</code>
                </li>
                <li>
                  Next to <strong>Subject identifier</strong>, select{" "}
                  <strong>Edit (optional)</strong> and replace it with{" "}
                  <code className="break-all">
                    {contribution.githubOidcSubject}
                  </code>
                </li>
              </ul>
              The repository uses GitHub&apos;s immutable subject format, so the
              default <code>repo:{contribution.githubRepository}</code> subject
              will not match. Do not create a client secret or certificate.
            </li>
            <li>
              From the app&apos;s <strong>Overview</strong>, copy the{" "}
              <strong>Directory (tenant) ID</strong> and{" "}
              <strong>Application (client) ID</strong> into{" "}
              <a className="readable-link" href={ownAppMailto}>
                this pre-filled email
              </a>{" "}
              and send it. I verify the connection and reply when it is live.
            </li>
          </ol>

          <h2 className="pt-2 text-xl font-semibold text-foreground">
            Your privacy
          </h2>
          <ul>
            <li>
              Your email address and tenant ID are kept in a private repository
              that only I can read, and are never published.
            </li>
            <li>
              The public workflow receives tenant IDs from an encrypted GitHub
              Actions secret, masks them in its logs, and reduces sign-in errors
              to error codes so logs never reveal which organizations
              contribute.
            </li>
            <li>
              The archive does not record which tenant a post came from. If you
              tell me your tenant is an education tenant, posts that only
              education tenants received are labelled &quot;Seen in EDU
              tenants&quot;, which never names or identifies a tenant. You are
              only{" "}
              {contributedTenants > 0 ? (
                <Link className="readable-link" href="#contributors">
                  credited
                </Link>
              ) : (
                "credited"
              )}{" "}
              if you ask to be. Otherwise your tenant is only counted.
            </li>
            <li>
              I will never ask you for a password, client secret, or
              certificate. If anyone does in the archive&apos;s name, it is not
              me.
            </li>
          </ul>

          <h2 className="pt-2 text-xl font-semibold text-foreground">
            Removing access
          </h2>
          <p>
            In the Microsoft Entra admin center, go to <strong>Entra ID</strong>{" "}
            &gt; <strong>Enterprise applications</strong>, open{" "}
            <strong>{contribution.appName}</strong>, and select{" "}
            <strong>Properties</strong> &gt; <strong>Delete</strong> (for option
            2, delete the app registration). Access stops as soon as the
            existing token expires, within an hour. Email{" "}
            <a className="readable-link" href={`mailto:${contribution.email}`}>
              {contribution.email}
            </a>{" "}
            if you would also like your details removed from my list.
          </p>
          <p>
            Questions first? Reach out through{" "}
            <Link
              className="readable-link"
              href="https://linkedin.com/in/merill"
            >
              LinkedIn
            </Link>
            ,{" "}
            <Link className="readable-link" href="https://twitter.com/merill">
              X
            </Link>
            , or{" "}
            <Link
              className="readable-link"
              href="https://bsky.app/profile/merill.net"
            >
              Bluesky
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
