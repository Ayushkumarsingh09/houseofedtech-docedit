"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { documentsApi } from "@/features/documents/api";

export function useCollaborators(documentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["collaborators", documentId],
    queryFn: () => documentsApi.listCollaborators(documentId),
    select: (data) => data.collaborators,
    enabled,
  });
}

export function useAddCollaborator(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: "EDITOR" | "VIEWER" }) =>
      documentsApi.addCollaborator(documentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", documentId] });
      toast.success("Collaborator added");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateCollaborator(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      documentsApi.updateCollaborator(documentId, userId, role),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["collaborators", documentId] }),
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRemoveCollaborator(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => documentsApi.removeCollaborator(documentId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", documentId] });
      toast.success("Collaborator removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
