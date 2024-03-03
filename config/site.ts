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
      title: "merill.net",
      href: "https://merill.net",
    },
  ],
  links: {
    twitter: "https://twitter.com/merill",
    github: "https://github.com/merill/mc",
  },
}
