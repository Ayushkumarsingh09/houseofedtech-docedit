"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { documentsApi } from "@/features/documents/api";
import type { CreateDocumentInput } from "@/schemas/document.schema";

const DOCUMENTS_KEY = ["documents"] as const;

export function useDocuments() {
  return useQuery({
    queryKey: DOCUMENTS_KEY,
    queryFn: documentsApi.list,
    select: (data) => data.documents,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateDocumentInput) => documentsApi.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      router.push(`/documents/${data.document.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      toast.success("Document deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useArchiveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      documentsApi.update(id, { isArchived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
