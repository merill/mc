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
      title: "Yako",
      href: "https://getyako.com",
    },
  ],
  links: {
    twitter: "https://twitter.com/merill",
    github: "https://github.com/merill/mc",
  },
}
