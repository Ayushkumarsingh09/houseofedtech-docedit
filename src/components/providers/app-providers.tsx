"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Auth hydration deliberately does NOT run here. `/api/auth/me` returns a
 * 401 for signed-out visitors, and the marketing/login/signup pages never
 * read auth state — fetching it globally would just add console noise and
 * an unnecessary request on every public page view. It's triggered instead
 * from the authenticated app shell, see `src/app/(app)/layout.tsx`.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
