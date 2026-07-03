"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { versionsApi } from "@/features/versions/api";

export function useVersions(documentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["versions", documentId],
    queryFn: () => versionsApi.list(documentId),
    select: (data) => data.versions,
    enabled,
  });
}

export function useVersionDetail(documentId: string, versionId: string | null) {
  return useQuery({
    queryKey: ["versions", documentId, versionId],
    queryFn: () => versionsApi.get(documentId, versionId as string),
    select: (data) => data.version,
    enabled: Boolean(versionId),
  });
}

export function useCreateSnapshot(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label?: string) => versionsApi.create(documentId, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions", documentId] });
      toast.success("Snapshot saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRestoreVersion(
  documentId: string,
  onRestored: (content: string) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => versionsApi.restore(documentId, versionId),
    onSuccess: async (_data, versionId) => {
      queryClient.invalidateQueries({ queryKey: ["versions", documentId] });
      const detail = await versionsApi.get(documentId, versionId);
      onRestored(detail.version.content);
      toast.success("Document restored");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
