import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
