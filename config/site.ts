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
    // Application (client) ID of the multi-tenant contributor app. It is not a
    // secret: it appears in the admin consent link and on the consent prompt.
    clientId: "158ad002-7467-454f-ba15-229a0b719811",
    appName: "Message Center Archive - Reader",
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
