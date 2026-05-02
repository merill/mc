import { Metadata } from "next"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const skillUrl =
  "https://skills.sh/merill/mc/microsoft-365-message-center-archive"
const skillInstallCommand = "npx skills add merill/mc"

const skillPrompt = `Use the Microsoft 365 Message Center Archive at https://mc.merill.net/.

Workflow:
1. Read https://mc.merill.net/llms.txt for current guidance and URLs.
2. Search https://mc.merill.net/messages-index.json by Message Center ID, Roadmap ID, title, source, service, category, tag, date, or summary text.
3. Open the record's Url field for the canonical detail page before citing or summarizing.
4. Cite canonical detail pages such as https://mc.merill.net/message/{id}.
5. For Message Center posts, always mention that posts are tenant-specific and users should verify applicability in their own Microsoft 365 admin center.`

export const metadata: Metadata = {
  title: "Agent Skill",
  description:
    "Install and use the Microsoft 365 Message Center Archive as an agent skill for AI-assisted search and citation.",
  alternates: {
    canonical: "/skill",
  },
  openGraph: {
    title: `Agent Skill | ${siteConfig.name}`,
    description:
      "Use the archive as an agent skill for Microsoft 365 Message Center and Roadmap search.",
    url: "/skill",
    images: ["/og-default.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `Agent Skill | ${siteConfig.name}`,
    description:
      "Use the archive as an agent skill for Microsoft 365 Message Center and Roadmap search.",
    images: ["/og-default.png"],
  },
}

export default function SkillPage() {
  return (
    <section className="page-shell">
      <div className="page-intro">
        <h1 className="page-title">Agent Skill</h1>
        <p className="page-description">
          Use this archive from Claude Code, Cursor, Windsurf, and other agents
          that support Agent Skills. The skill teaches agents how to search the
          archive, cite canonical message pages, and warn that Message Center
          posts are tenant-specific.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Install from skills.sh</CardTitle>
          </CardHeader>
          <CardContent className="readable-card-content">
            <p>
              The skill is published on skills.sh and can be installed directly
              by supported agents with the Skills CLI.
            </p>
            <pre className="code-block">
              <code>{skillInstallCommand}</code>
            </pre>
            <p>
              View the published skill at{" "}
              <Link className="readable-link" href={skillUrl}>
                skills.sh/merill/mc/microsoft-365-message-center-archive
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Point your agent here</CardTitle>
          </CardHeader>
          <CardContent className="readable-card-content">
            <p>
              If your agent cannot install skills directly, point it to the AI
              guide and search index for this site.
            </p>
            <ul>
              <li>
                Agent guide:{" "}
                <Link className="readable-link" href="/llms.txt">
                  https://mc.merill.net/llms.txt
                </Link>
              </li>
              <li>
                Search index:{" "}
                <Link className="readable-link" href="/messages-index.json">
                  https://mc.merill.net/messages-index.json
                </Link>
              </li>
              <li>
                RSS feed:{" "}
                <Link className="readable-link" href="/rss.xml">
                  https://mc.merill.net/rss.xml
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Copy and paste instructions</CardTitle>
        </CardHeader>
        <CardContent className="readable-card-content">
          <p>
            Paste this into any AI agent when you want it to use the archive
            without installing the skill.
          </p>
          <pre className="code-block whitespace-pre-wrap">
            <code>{skillPrompt}</code>
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Use it in Claude Code</CardTitle>
        </CardHeader>
        <CardContent className="readable-card-content">
          <p>
            Claude Code supports Agent Skills. After installing the skill, ask
            Claude about Microsoft 365 Message Center or Roadmap announcements,
            or invoke the skill directly if it appears in your slash command
            menu.
          </p>
          <pre className="code-block">
            <code>/microsoft-365-message-center-archive MC123456</code>
          </pre>
          <p>
            For manual Claude Code setup, create a personal skill at{" "}
            <code className="rounded bg-muted px-1.5 py-1 text-foreground">
              ~/.claude/skills/microsoft-365-message-center-archive/SKILL.md
            </code>{" "}
            and paste the skill content from the repository.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
