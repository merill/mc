export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Microsoft 365 Message Center Archive",
  url: "https://mc.merill.net",
  description:
    "Searchable archive of Microsoft 365 Message Center messages and Microsoft 365 Roadmap posts.",
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "About",
      href: "/about",
    },
    {
      title: "Agent Skill",
      href: "/skill",
    },
  ],
  rightNav: [
    {
      title: "Merill.Net",
      href: "https://merill.net",
    },
    {
      title: "Entra.News",
      href: "https://entra.news",
    },
    {
      title: "Maester",
      href: "https://maester.dev",
    },
    {
      title: "Maester.Cloud",
      href: "https://maester.cloud",
    },
  ],
  tenantContribution: {
    // Application (client) ID of the multi-tenant contributor app, supplied at
    // build time from the GRAPH_CONTRIBUTOR_CLIENT_ID repository variable.
    clientId: process.env.NEXT_PUBLIC_CONTRIBUTOR_CLIENT_ID?.trim() ?? "",
    appName: "Message Center Archive",
    email: "merill@merill.net",
    redirectUri: "https://mc.merill.net/connect",
    githubRepository: "merill/mc",
    githubBranch: "main",
  },
  links: {
    rss: "/rss.xml",
    twitter: "https://twitter.com/merill",
    github: "https://github.com/merill/mc",
  },
}
