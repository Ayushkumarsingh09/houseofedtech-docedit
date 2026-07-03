"use client";

import { CheckCircle2, CloudOff, Loader2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/utils";
import { useSyncStore } from "@/stores/sync-store";

export function SyncStatusIndicator() {
  const { networkStatus, phase, pendingCount, lastSyncedAt, lastError } = useSyncStore();

  if (networkStatus === "offline") {
    return (
      <StatusBadge
        icon={<CloudOff className="size-3.5" />}
        label="Offline"
        detail={
          pendingCount > 0
            ? `${pendingCount} change${pendingCount === 1 ? "" : "s"} saved locally, will sync automatically.`
            : "Working offline. Your edits are saved locally."
        }
        variant="warning"
      />
    );
  }

  if (phase === "syncing") {
    return (
      <StatusBadge
        icon={<Loader2 className="size-3.5 animate-spin" />}
        label="Syncing…"
        detail={`Syncing ${pendingCount} pending change${pendingCount === 1 ? "" : "s"}.`}
        variant="secondary"
      />
    );
  }

  if (phase === "error") {
    return (
      <StatusBadge
        icon={<RefreshCw className="size-3.5" />}
        label="Retrying"
        detail={lastError ?? "Temporary sync issue — retrying automatically."}
        variant="destructive"
      />
    );
  }

  return (
    <StatusBadge
      icon={<CheckCircle2 className="size-3.5" />}
      label="Synced"
      detail={
        lastSyncedAt ? `Last synced ${formatRelativeTime(lastSyncedAt)}` : "Up to date"
      }
      variant="success"
    />
  );
}

function StatusBadge({
  icon,
  label,
  detail,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  variant: "warning" | "secondary" | "destructive" | "success";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant} className="cursor-default gap-1.5 px-2.5 py-1">
          {icon}
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{detail}</TooltipContent>
    </Tooltip>
  );
}
