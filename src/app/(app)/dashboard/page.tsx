"use client";

import { FilePlus } from "lucide-react";

import { AppTopbar } from "@/components/layout/app-topbar";
import { Button } from "@/components/ui/button";
import { DocumentGrid } from "@/features/documents/components/document-grid";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCreateDocument } from "@/features/documents/hooks/use-documents";

export default function DashboardPage() {
  const { user } = useAuth();
  const createDocument = useCreateDocument();

  return (
    <>
      <AppTopbar>
        <h1 className="truncate text-lg font-semibold">
          {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
        </h1>
      </AppTopbar>
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Your documents</h2>
              <p className="text-muted-foreground text-sm">
                Everything here works offline — edits sync automatically when you&apos;re
                back online.
              </p>
            </div>
            <Button onClick={() => createDocument.mutate({ title: "Untitled document" })}>
              <FilePlus className="size-4" /> New document
            </Button>
          </div>
          <DocumentGrid />
        </div>
      </main>
    </>
  );
}
