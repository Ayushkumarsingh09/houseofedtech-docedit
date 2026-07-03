"use client";

import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentCard } from "@/features/documents/components/document-card";
import {
  useCreateDocument,
  useDocuments,
} from "@/features/documents/hooks/use-documents";

export function DocumentGrid() {
  const { data: documents, isLoading } = useDocuments();
  const createDocument = useCreateDocument();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  const active = documents?.filter((d) => !d.isArchived) ?? [];

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
        <div className="bg-primary/10 text-primary mb-4 flex size-14 items-center justify-center rounded-2xl">
          <FileText className="size-6" />
        </div>
        <h3 className="text-lg font-semibold">No documents yet</h3>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Create your first document — it works instantly, even without an internet
          connection.
        </p>
        <Button
          className="mt-6"
          onClick={() => createDocument.mutate({ title: "Untitled document" })}
        >
          Create a document
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {active.map((document) => (
        <DocumentCard key={document.id} document={document} />
      ))}
    </div>
  );
}
