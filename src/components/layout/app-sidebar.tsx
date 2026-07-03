"use client";

import { FilePlus, LayoutDashboard, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { useCreateDocument } from "@/features/documents/hooks/use-documents";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const createDocument = useCreateDocument();
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

  return (
    <aside className="border-border bg-card/40 hidden w-64 shrink-0 flex-col border-r p-4 md:flex">
      <Logo href="/dashboard" className="mb-6 px-2" />

      <Button
        className="mb-2 justify-start"
        onClick={() => createDocument.mutate({ title: "Untitled document" })}
      >
        <FilePlus className="size-4" /> New document
      </Button>
      <Button
        variant="outline"
        className="text-muted-foreground mb-6 justify-between"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" /> Search
        </span>
        <kbd className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </Button>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
