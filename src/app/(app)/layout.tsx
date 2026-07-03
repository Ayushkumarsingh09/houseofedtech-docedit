"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CommandPalette } from "@/components/layout/command-palette";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuth, useAuthHydration } from "@/features/auth/hooks/use-auth";
import { useSyncLifecycle } from "@/features/sync/hooks/use-sync-lifecycle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useAuthHydration();
  const { status } = useAuth();
  const router = useRouter();
  useSyncLifecycle();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <CommandPalette />
    </div>
  );
}
