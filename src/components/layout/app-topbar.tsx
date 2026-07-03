"use client";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { SyncStatusIndicator } from "@/features/sync/components/sync-status-indicator";

export function AppTopbar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-border bg-background/80 sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b px-6 backdrop-blur-md">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex items-center gap-3">
        <SyncStatusIndicator />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
