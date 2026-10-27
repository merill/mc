import * as React from "react"
import { Metadata } from "next"
import Link from "next/link"
import {
  Bookmark,
  Cog,
  History,
  Lightbulb,
  MessageSquare,
  Reply,
  Rss,
  ThumbsUp,
  Users,
  type LucideIcon,
} from "lucide-react"

import { siteConfig } from "@/config/site"
import { getContributorCredits } from "@/lib/tenant-contribution"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExampleDiscussion } from "@/components/example-discussion"

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

const CAN_DO: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ThumbsUp,
    title: "Like or dislike a post",
    text: "One press shows how a change is landing. The counts show on the post and in the list.",
  },
  {
    icon: MessageSquare,
    title: "Comment",
    text: "Say when it reached your tenant, what it did, and what you changed. Or ask what a line in the post means.",
  },
  {
    icon: Reply,
    title: "Reply and like comments",
    text: "Answer someone directly, and like the comments that helped so the next reader finds them first.",
  },
  {
    icon: Bookmark,
    title: "Save views",
    text: "Keep the list the way you want it, such as your own products with major changes only, and switch between views.",
  },
]

const FEEDS = [
  {
    title: "Message Center",
    path: siteConfig.feeds.messageCenter,
    text: "the default feed, listing Message Center posts only.",
  },
  {
    title: "Roadmap",
    path: siteConfig.feeds.roadmap,
    text: "Microsoft 365 Roadmap posts.",
  },
  {
    title: "Azure updates",
    path: siteConfig.feeds.azure,
    text: "every update on azure.microsoft.com/updates.",
  },
]

/** A card's title with its icon in front. */
function IconTitle(props: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <props.icon className="size-4" aria-hidden="true" />
      </span>
      {props.children}
    </CardTitle>
  )
}

export default function AboutPage() {
  const { tenants: contributedTenants } = getContributorCredits()

  return (
    <section className="page-shell">
      <div className="page-intro">
        <h1 className="page-title">About this archive</h1>
        <p className="page-description">
          I&apos;m{" "}
          <a className="readable-link" href="https://merill.net/about">
            Merill Fernando
          </a>
          . I build tools and write about Microsoft 365 and Microsoft Entra to
          help admins keep up with constant change.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <IconTitle icon={Lightbulb}>Why I built this</IconTitle>
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
            <IconTitle icon={Cog}>How it works</IconTitle>
          </CardHeader>
          <CardContent className="readable-card-content">
            <p>
              A scheduled job reads Message Center posts from the Microsoft 365
              test tenants through Microsoft Graph, merges what each tenant can
              see, saves each post for history, and publishes a searchable
              static site.
            </p>
            <p>
              The site also imports Microsoft 365 Roadmap RSS items and Azure
              updates from Microsoft&apos;s public feed, generates static
              pages, and exposes sitemap, RSS, and AI-friendly index files for
              discovery.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card id="discuss" className="scroll-mt-20">
          <CardHeader>
            <IconTitle icon={MessageSquare}>Like, comment and discuss</IconTitle>
          </CardHeader>
          <CardContent className="readable-card-content">
            <p>
              A post tells you what is changing. It cannot tell you how it went
              in the tenant that got it a week before yours. So every Message
              Center, Roadmap and Azure Updates post has a discussion on its
              page.
            </p>
            <div className="grid gap-4 py-1">
              {CAN_DO.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                    <item.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold leading-6">{item.title}</p>
                    <p className="text-[15px] leading-6 text-foreground/80">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p>
              Discussions are hosted on{" "}
              <a className="readable-link" href={siteConfig.zap.url}>
                zap.ms
              </a>
              , a community site I&apos;m building for people in the Microsoft
              community, focused on tech and getting work done. You sign in
              once, and stay on this site. An MVP or Microsoft badge next to a
              name is verified.
            </p>
          </CardContent>
        </Card>

        <ExampleDiscussion />
      </div>

      <Card id="contribute" className="scroll-mt-20">
        <CardHeader>
          <IconTitle icon={Users}>Help improve tenant coverage</IconTitle>
        </CardHeader>
        <CardContent className="readable-card-content">
          <p>
            Message Center posts differ by tenant, so some are only seen by
            education, government or specially licensed tenants.{" "}
            {contributedTenants > 0
              ? `${contributedTenants} ${
                  contributedTenants === 1 ? "tenant is" : "tenants are"
                } shared with the archive so far, including education tenants.`
              : null}
          </p>
          <p>
            If you manage a tenant, you can let the archive read its Message
            Center. It is read-only, takes about five minutes, and there is no
            password or secret to share.
          </p>
          <p>
            <Link
              className={buttonVariants({ variant: "outline" })}
              href="/contribute"
            >
              Contribute your tenant
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card id="feeds" className="scroll-mt-20">
        <CardHeader>
          <IconTitle icon={Rss}>RSS feeds</IconTitle>
        </CardHeader>
        <CardContent className="readable-card-content">
          <p>
            Each source has its own RSS feed, so you can follow only the updates
            you care about. Each feed lists its latest 500 items, newest first.
          </p>
          <ul>
            {FEEDS.map((feed) => (
              <li key={feed.path}>
                <span className="font-semibold">{feed.title}</span>: {feed.text}{" "}
                <a
                  className="readable-link break-all"
                  href={`${siteConfig.url}${feed.path}`}
                >
                  {`${siteConfig.url}${feed.path}`}
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <IconTitle icon={History}>Release notes</IconTitle>
        </CardHeader>
        <CardContent className="readable-card-content space-y-5">
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              October 27, 2026
            </h2>
            <ul>
              <li>
                The{" "}
                <Link className="readable-link" href="/contribute#coverage">
                  Contribute your tenant
                </Link>{" "}
                page now lists the licenses the archive already covers and the
                ones it is still looking for, so contributors can tell whether
                their tenant fills a gap.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              October 25, 2026
            </h2>
            <ul>
              <li>
                The default RSS feed now lists only Message Center posts.
                Roadmap posts and Azure updates each have their own feed, and
                the About page lists all three.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              October 13, 2026
            </h2>
            <ul>
              <li>
                Azure updates are now part of the archive: every update
                Microsoft has published on{" "}
                <a
                  className="readable-link"
                  href="https://azure.microsoft.com/updates"
                >
                  azure.microsoft.com/updates
                </a>{" "}
                since 2013, refreshed hourly, each with its own page showing
                its status, timeline, products and tags. Use the Azure Updates
                button above the list to see only those, and the Service filter
                to pick Azure products. They are in search, the RSS feed and
                the AI index too, and each has a discussion and tracked version
                history like every other post.
              </li>
              <li>
                When a service filter or a View option leaves the list empty,
                it now says &quot;Showing 0 of&quot; however many posts that
                source has, names the filters to check, and offers a button to
                clear them. Azure names its products differently from Microsoft
                365 services, so a service picked for Message Center matches no
                Azure update.
              </li>
              <li>
                Version history opens on the post&apos;s own page instead of on
                a page per version. Every post still lists its versions and
                which fields changed in each. Opening a version, or comparing
                two, now needs a free zap.ms account, the same sign-in as for
                likes and comments. Links to the old version and comparison
                pages still work, and versions are numbered (
                <code>?v=3</code>, <code>?from=2&amp;to=5</code>), which also
                makes reachable the versions that shared a timestamp with
                another.
              </li>
              <li>
                The list on the home page has View options: show major changes
                only, hide expired posts, choose the sort order, and add or
                remove the Source, Service and Last updated columns.
              </li>
              <li>
                You can save what you have set up as a named view, such as
                &quot;My products&quot;, and switch between views from the tabs
                above the list. Saving needs a free zap.ms account, so your
                views follow you to any browser; the list opens in the view you
                used last.
              </li>
              <li>
                The home page no longer repeats the site&apos;s name in large
                type. One line says what the site is and links to this page.
              </li>
              <li>
                This page now covers likes, comments and saved views. The
                step-by-step guide to contributing a tenant moved to its own{" "}
                <Link className="readable-link" href="/contribute">
                  Contribute your tenant
                </Link>{" "}
                page.
              </li>
              <li>
                A strip at the top of every page announces that you can like
                and comment on Message Center posts. It opens a new{" "}
                <Link className="readable-link" href="/discuss">
                  Discuss
                </Link>{" "}
                page that explains what you can do, why it is here and how to
                help, with an example discussion. Dismissing the strip is
                remembered in your browser.
              </li>
              <li>
                Posts no longer show as expired when one of the tenants
                contributing to the archive cannot be reached. They stay as they
                were until that tenant answers again or the post reaches its own
                end date.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              October 12, 2026
            </h2>
            <ul>
              <li>
                Posts that only the education tenants contributing to the
                archive received now carry a &quot;Seen in EDU tenants&quot;
                label, shown as an EDU badge in the list and under Tag on the
                post. Click the label to see what it means.
              </li>
              <li>
                Comments in a discussion now have a Like button with its count,
                next to Reply, in place of the score beside the name. Report and
                Delete moved into a &quot;…&quot; menu on each comment. When you
                are signed in, a bell in the header links to your notifications
                on zap.ms and shows how many are unread.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              October 11, 2026
            </h2>
            <ul>
              <li>
                The home page list now shows the likes, dislikes and comment
                count of each post that has a discussion, and Active
                discussions opens the post on this site at its discussion.
                Counts in lists can be up to ten minutes behind; your own
                likes and comments show straight away.
              </li>
              <li>
                You can now like, dislike, comment and reply on a post without
                leaving this site. The first time, you sign in with a zap.ms
                account and come straight back to the post you were reading.
              </li>
              <li>
                Likes and comments now show the moment you press the button,
                and a comment you are still writing is kept in your browser
                until you post or discard it.
              </li>
              <li>
                Comments now show each person&apos;s zap.ms profile photo, and
                once you are signed in the top of the page shows your photo
                instead of your username.
              </li>
              <li>
                You can flag a comment for the moderators, and delete your own
                comment for ten minutes after posting it.
              </li>
              <li>
                The top of every page now has a Sign in button, and shows who
                you are once signed in. The RSS, GitHub and Twitter links have
                moved to the bottom of the page.
              </li>
              <li>
                Comment and reply boxes now link to the community guidelines.
                We keep discussions friendly: assume the other person means
                well.
              </li>
              <li>
                The bottom of every page now links to the privacy policy and
                terms of use, which cover this site and zap.ms.
              </li>
              <li>
                Long service names on a post, such as Microsoft Copilot
                (Microsoft 365), now wrap inside their card instead of being cut
                off.
              </li>
              <li>
                If you have a Microsoft badge on zap.ms, a notice at the top of
                the page now tells you when it is time to confirm your Microsoft
                email again, with a link to do it.
              </li>
            </ul>
          </div>
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
