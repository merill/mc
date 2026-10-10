import * as React from "react"
import { Metadata } from "next"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import {
  getAdminConsentUrl,
  getContributorCredits,
  getLinkLabel,
  getOwnAppMailto,
} from "@/lib/tenant-contribution"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "About",
  description:
    "About the Microsoft 365 Message Center and Roadmap Archive, why it exists, and how the data is collected.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: `About | ${siteConfig.name}`,
    description:
      "Why this Microsoft 365 Message Center and Roadmap archive exists and how it works.",
    url: "/about",
    images: ["/og-default.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `About | ${siteConfig.name}`,
    description:
      "Why this Microsoft 365 Message Center and Roadmap archive exists and how it works.",
    images: ["/og-default.png"],
  },
}

const contribution = siteConfig.tenantContribution
const [githubOwner, githubRepo] = contribution.githubRepository.split("/")

export default function AboutPage() {
  const consentUrl = getAdminConsentUrl()
  const ownAppMailto = getOwnAppMailto()
  const { tenants: contributedTenants, credits } = getContributorCredits()
  const anonymousTenants = contributedTenants - credits.length

  return (
    <section className="page-shell">
      <div className="page-intro">
        <h1 className="page-title">About this archive</h1>
        <p className="page-description">
          I&apos;m Merill Fernando. I build tools and write about Microsoft 365
          and Microsoft Entra to help admins keep up with constant change.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Why I built this</CardTitle>
          </CardHeader>
          <CardContent className="readable-card-content">
            <p>
              Message Center posts are useful, but they are hard to link to,
              search, and reference outside the Microsoft 365 admin center. I
              built this archive so posts can be found quickly and shared from
              places like Entra.News.
            </p>
            <p>
              This site is for reference only. Message Center posts are
              customized by tenant, so always use your own tenant&apos;s Message
              Center as the source of truth.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="readable-card-content">
            <p>
              A scheduled job reads Message Center posts from the Microsoft 365
              test tenants through Microsoft Graph, merges what each tenant can
              see, saves each post for history, and publishes a searchable
              static site.
            </p>
            <p>
              The site also imports Microsoft 365 Roadmap RSS items, generates
              static pages, and exposes sitemap, RSS, and AI-friendly index
              files for discovery.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card id="contribute" className="scroll-mt-20">
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
              The archive does not record which tenant a post came from, and you
              are only{" "}
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

      <Card>
        <CardHeader>
          <CardTitle>Release notes</CardTitle>
        </CardHeader>
        <CardContent className="readable-card-content space-y-5">
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              October 10, 2026
            </h2>
            <ul>
              <li>
                Every Message Center and Roadmap post now has a Discussion
                section. You can see how many people liked or disliked a change
                and read what other admins are saying about it. Likes, dislikes
                and comments are made on zap.ms, a community site for Microsoft
                admins, and each button takes you there.
              </li>
              <li>
                The home page shows the posts being discussed right now, when
                there are any.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              October 6, 2026
            </h2>
            <ul>
              <li>
                Fixed the instructions for contributing a tenant with your own
                app registration. The federated credential now uses the subject
                identifier GitHub actually sends for this repository, so sign-in
                no longer fails with AADSTS700213.
              </li>
              <li>
                Contributors in the thank-you list can now share more than one
                link, such as a LinkedIn profile and a company site.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              October 5, 2026
            </h2>
            <ul>
              <li>
                After granting consent, contributors now fill in a short
                optional form (tenant type, notable licenses, and whether to be
                credited) and see the exact email before sending or copying it.
              </li>
              <li>
                The contribution form asks whether the tenant is an Entra ID
                workforce tenant or an Entra External ID tenant, and offers
                common tenant types such as EDU, GCC, Nonprofit, and Developer
                Program sandboxes as quick picks alongside a field for typing
                any other type.
              </li>
              <li>
                Added a thank-you list of tenant contributors to this page. Only
                people who ask to be credited are named; everyone else is
                counted anonymously.
              </li>
              <li>
                Home page filters are now bookmarkable and shareable. Service
                selections, source, and search text are saved in the URL and
                restored when you open the link.
              </li>
              <li>
                New and updated posts now reach the site soon after they are
                fetched instead of waiting for the next scheduled site build.
                Each data refresh that finds new posts starts a site build right
                away, and refreshes also check that the live site is not serving
                stale data.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              October 2, 2026
            </h2>
            <ul>
              <li>
                Added step-by-step instructions for contributing a tenant to the
                archive, either with one-click admin consent to a read-only app
                or with your own app registration. Both use workload identity
                federation, so there is no secret to share, and contributing
                tenants are kept private.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              September 15, 2026
            </h2>
            <ul>
              <li>
                Fixed the RSS feed so it includes Message Center posts again.
                Roadmap posts were always ranked ahead of Message Center posts
                and filled every slot, so the feed now lists the latest 500
                posts from both sources newest first.
              </li>
              <li>
                Fixed opening posts from the archive table in Safari on Mac,
                iPad, and iPhone. Selecting any row opened the same unrelated
                post; each row now opens its own post.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              August 22, 2026
            </h2>
            <ul>
              <li>
                Table columns are now sortable. Click ID, Title, or Last updated
                to sort, and click again to reverse it. While searching, sorting
                applies to every match rather than only the results already
                loaded.
              </li>
              <li>
                Fixed the default ordering of the archive. Expired posts were
                listed after every active and Roadmap post instead of being
                merged into the date order, so the browse view now shows all
                posts newest first.
              </li>
              <li>
                Search results now favour recent posts. Among matches of
                comparable relevance the newest one ranks first, which suits
                change alerts, while a decisively better match still wins
                however old it is.
              </li>
              <li>
                Added an RSS link to the site header so the existing feed of the
                latest 500 Message Center and Roadmap posts is easier to find.
              </li>
              <li>
                Replaced the ID and title filters with full-text search across
                every post, including the full body text of expired posts.
                Search runs entirely in the browser against a pre-built Pagefind
                index, ranks results by relevance, highlights the matched words
                in context, and still honours the source and service filters.
              </li>
              <li>
                The archive now collects Message Center posts from more than one
                source tenant and merges them, so posts and details that are
                only visible to a tenant with different licensing are included.
                When the same post comes from several tenants, the most recently
                updated and most detailed copy is kept.
              </li>
              <li>
                The site now rebuilds every four hours instead of twice a day,
                so new and updated posts appear here sooner after Microsoft
                publishes them.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              August 3, 2026
            </h2>
            <ul>
              <li>
                Added automatic Discord notifications for newly discovered
                Microsoft Entra Message Center posts, with durable delivery
                tracking and links to their archived pages. Documentation and
                Message Center notifications now share the Entra Scout webhook
                identity while retaining distinct message formats. Message
                Center matching includes Entra product labels and title-only
                Entra mentions.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              May 4, 2026
            </h2>
            <ul>
              <li>
                Linked Message Center IDs that appear in post summaries, in
                addition to the post body.
              </li>
              <li>
                Added a metadata cards panel to version comparison and snapshot
                pages so changes to fields like tags, severity, status, and
                release phase are visible at a glance alongside the body diff.
              </li>
              <li>
                Smooth-scroll when jumping to in-page sections like Version
                history, with a brief highlight pulse on arrival. Honors the
                operating system&apos;s reduced-motion preference.
              </li>
              <li>
                Reworked the Version history card so the two most common
                comparisons &mdash; latest vs previous and latest vs original
                &mdash; are one-click primary buttons at the top, with a summary
                line showing how many times the post has been updated since its
                original publish date.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              May 3, 2026
            </h2>
            <ul>
              <li>
                Added click-to-enlarge image previews on Message Center and
                Roadmap detail pages, with a fullscreen lightbox and keyboard
                support.
              </li>
              <li>
                Added per-message version history with a timeline of prior
                versions, dedicated snapshot pages for each version, and inline
                visual diffs (additions in green, deletions in red) comparing
                any two versions of a Message Center or Roadmap post.
              </li>
              <li>
                Linked plain-text references between Message Center posts inside
                body content, added a Related posts panel showing References and
                Referenced by, and exposed those edges in messages-index.json
                for AI and search consumers.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              May 2, 2026
            </h2>
            <ul>
              <li>
                Added Microsoft 365 Roadmap posts alongside Message Center
                posts, with source labels, icons, filtering, and detail pages.
              </li>
              <li>
                Added archived Message Center support, including archive-only
                detail pages, expired badges, and expired announcement banners.
              </li>
              <li>
                Improved home page performance with precomputed service filters
                and natural incremental row loading.
              </li>
              <li>
                Added searchable multi-select service filtering, wider
                fixed-width dropdown behavior, and source filters for Message
                Center and Roadmap.
              </li>
              <li>
                Added SEO and sharing support with canonical metadata, Open
                Graph and Twitter cards, sitemap, robots file, and a branded
                social image.
              </li>
              <li>
                Added AI-friendly discovery through llms.txt and a compact
                messages-index.json for agents and search tools.
              </li>
              <li>
                Added a skills.sh-compatible agent skill and Skill page for
                AI-assisted archive search and canonical citation.
              </li>
              <li>
                Added a static RSS feed with the latest 500 active Message
                Center and Roadmap items.
              </li>
              <li>
                Added this About page, updated homepage guidance about
                tenant-specific Message Center posts, and added top navigation
                links.
              </li>
              <li>
                Updated dependencies to clear Dependabot vulnerabilities and
                moved the site to Next.js 15.
              </li>
              <li>
                Improved the data refresh script, including more reliable
                Roadmap fetching on GitHub Actions.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
