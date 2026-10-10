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
    // merill/mc uses GitHub's immutable OIDC subject, which names the owner and
    // repository with their numeric IDs, so federated credentials must too.
    githubOidcSubject: "repo:merill@1288081/mc@761074595:ref:refs/heads/main",
  },
  // Discussion is hosted on zap.ms. This site only reads from its public API
  // and links there for every reaction and reply. The environment variable
  // points a local build at a local zap server.
  zap: {
    url: process.env.NEXT_PUBLIC_ZAP_URL ?? "https://zap.ms",
  },
  links: {
    rss: "/rss.xml",
    twitter: "https://twitter.com/merill",
    github: "https://github.com/merill/mc",
  },
}
