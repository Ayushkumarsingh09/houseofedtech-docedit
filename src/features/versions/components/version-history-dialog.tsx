"use client";

import { Camera, History, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateSnapshot,
  useRestoreVersion,
  useVersionDetail,
  useVersions,
} from "@/features/versions/hooks/use-versions";
import { VersionDiff } from "@/features/versions/components/version-diff";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface VersionHistoryDialogProps {
  documentId: string;
  currentContent: string;
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: (content: string) => void;
}

export function VersionHistoryDialog({
  documentId,
  currentContent,
  canEdit,
  open,
  onOpenChange,
  onRestored,
}: VersionHistoryDialogProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const { data: versions, isLoading } = useVersions(documentId, open);
  const selected = useVersionDetail(documentId, selectedVersionId);
  const createSnapshot = useCreateSnapshot(documentId);
  const restoreVersion = useRestoreVersion(documentId, onRestored);

  const activeVersionId = selectedVersionId ?? versions?.[0]?.id ?? null;
  const activeDetail = selectedVersionId ? selected.data : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5" /> Version history
          </DialogTitle>
          <DialogDescription>
            Browse snapshots of this document and restore any previous state.
          </DialogDescription>
        </DialogHeader>

        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => createSnapshot.mutate(undefined)}
            disabled={createSnapshot.isPending}
          >
            <Camera className="size-3.5" /> Save snapshot now
          </Button>
        )}

        <div className="grid grid-cols-[220px_1fr] gap-4">
          <div className="max-h-[50vh] scrollbar-thin space-y-1 overflow-y-auto border-r pr-3">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-md" />
              ))}
            {versions?.length === 0 && (
              <p className="text-muted-foreground text-sm">No snapshots yet.</p>
            )}
            {versions?.map((version) => (
              <button
                key={version.id}
                onClick={() => setSelectedVersionId(version.id)}
                className={cn(
                  "hover:bg-accent w-full rounded-md p-2 text-left text-sm transition-colors",
                  activeVersionId === version.id && "bg-accent",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">v{version.versionNumber}</span>
                  {!version.isAutomatic && (
                    <Badge variant="secondary" className="text-[10px]">
                      Manual
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground line-clamp-1 text-xs">
                  {version.label ?? "Automatic snapshot"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {formatRelativeTime(version.createdAt)} · {version.createdByName}
                </p>
              </button>
            ))}
          </div>

          <div className="min-w-0 space-y-3">
            {activeDetail ? (
              <>
                <VersionDiff before={activeDetail.content} after={currentContent} />
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={() => restoreVersion.mutate(activeDetail.id)}
                    disabled={restoreVersion.isPending}
                  >
                    <RotateCcw className="size-3.5" /> Restore this version
                  </Button>
                )}
              </>
            ) : (
              <p className="text-muted-foreground py-12 text-center text-sm">
                Select a version to preview the diff against the current document.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
