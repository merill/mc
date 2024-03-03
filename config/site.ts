export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Microsoft 365 Message Center Archive",
  description:
    "Archive of messages posted in the Message Center of the Microsoft 365 Admin Portal.",
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Merill.Net",
      href: "https://merill.net",
    },
    {
      title: "Entra.News",
      href: "https://entra.news",
    },
  ],
  links: {
    twitter: "https://twitter.com/merill",
    github: "https://github.com/merill/mc",
  },
}
