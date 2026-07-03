import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border/70 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#architecture"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Architecture
            </Link>
            <Link
              href="#security"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Security
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
