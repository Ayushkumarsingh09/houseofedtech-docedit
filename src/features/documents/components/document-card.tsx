"use client";

import { Archive, MoreHorizontal, Trash2, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useArchiveDocument,
  useDeleteDocument,
} from "@/features/documents/hooks/use-documents";
import { formatRelativeTime } from "@/lib/utils";
import type { DocumentSummary } from "@/types/document";

const ROLE_VARIANT: Record<DocumentSummary["role"], "default" | "secondary" | "outline"> =
  {
    OWNER: "default",
    EDITOR: "secondary",
    VIEWER: "outline",
  };

export function DocumentCard({ document }: { document: DocumentSummary }) {
  const archiveMutation = useArchiveDocument();
  const deleteMutation = useDeleteDocument();

  return (
    <div className="group border-border bg-card hover:border-primary/40 relative flex flex-col rounded-xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/documents/${document.id}`} className="flex flex-1 flex-col">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold">
            {document.title || "Untitled document"}
          </h3>
          <Badge variant={ROLE_VARIANT[document.role]} className="shrink-0">
            {document.role}
          </Badge>
        </div>
        <p className="text-muted-foreground line-clamp-3 min-h-[3.6em] flex-1 text-sm">
          {document.excerpt || "This document is empty. Click to start writing."}
        </p>
        <div className="text-muted-foreground mt-4 flex items-center justify-between text-xs">
          <span>Edited {formatRelativeTime(document.updatedAt)}</span>
          {document.collaboratorCount > 0 && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" /> {document.collaboratorCount}
            </span>
          )}
        </div>
      </Link>

      {document.role === "OWNER" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hover:bg-accent absolute top-4 right-4 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Document actions"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                archiveMutation.mutate({
                  id: document.id,
                  isArchived: !document.isArchived,
                })
              }
            >
              <Archive className="size-4" />
              {document.isArchived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => deleteMutation.mutate(document.id)}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
