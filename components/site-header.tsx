import Link from "next/link"

import { siteConfig } from "@/config/site"
import { AccountMenu } from "@/components/account-menu"
import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"

export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b">
      <div className="container flex h-16 min-w-0 items-center gap-4">
        <MainNav items={siteConfig.mainNav} />
        <div className="flex shrink-0 items-center justify-end">
          <nav className="flex items-center gap-5">
            <div className="hidden items-center gap-6 lg:flex">
              {siteConfig.rightNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center text-sm font-medium text-muted-foreground"
                >
                  {item.title}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <AccountMenu />
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
