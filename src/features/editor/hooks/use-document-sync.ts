"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useState } from "react";

import type { OperationTypeName } from "@/constants";
import { documentsApi } from "@/features/documents/api";
import { db } from "@/lib/offline/db";
import { diffToOperations } from "@/lib/sync-engine/diff-to-operations";
import { enqueueOperation } from "@/lib/sync-engine/operation-queue";
import { syncEngine } from "@/lib/sync-engine/sync-engine";
import type { OperationPayload } from "@/types/sync";

const PAYLOAD_TO_TYPE: Record<OperationPayload["kind"], OperationTypeName> = {
  insert: "INSERT",
  delete: "DELETE",
  replace: "REPLACE",
  set_content: "SET_CONTENT",
  rename: "RENAME",
};

interface UseDocumentSyncOptions {
  documentId: string;
  userId: string;
}

/**
 * The local-first document loading contract:
 *   1. Read Dexie immediately — if present, the editor renders with zero
 *      network latency (this is what "no loading screens" means in
 *      practice).
 *   2. If this is the first time this browser has seen the document, fall
 *      back to a one-time network fetch to hydrate Dexie.
 *   3. From then on, all reads are local; the sync engine reconciles with
 *      the server in the background and this hook only re-renders the
 *      editor when it's safe to do so (see `sync-engine.ts`).
 */
export function useDocumentSync({ documentId, userId }: UseDocumentSyncOptions) {
  const [notFoundOffline, setNotFoundOffline] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);

  const localDoc = useLiveQuery(() => db.documents.get(documentId), [documentId]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const existing = await db.documents.get(documentId);
      if (existing) {
        setIsHydrating(false);
        syncEngine.requestSync(documentId);
        return;
      }

      try {
        const { document } = await documentsApi.get(documentId);
        if (cancelled) return;
        await db.documents.put({
          id: document.id,
          title: document.title,
          content: document.content,
          contentJson: document.contentJson,
          role: document.role,
          ownerId: document.ownerId,
          ownerName: document.ownerName,
          serverVersion: document.version,
          isArchived: document.isArchived,
          isDeleted: false,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          isDirty: false,
          isHydrated: true,
        });
      } catch {
        if (!cancelled) setNotFoundOffline(true);
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const recordChange = useCallback(
    async (previousContent: string, nextContent: string) => {
      if (!localDoc) return;
      const payloads = diffToOperations(previousContent, nextContent);
      for (const payload of payloads) {
        await enqueueOperation({
          documentId,
          userId,
          type: PAYLOAD_TO_TYPE[payload.kind],
          payload,
          baseVersion: localDoc.serverVersion,
        });
      }
      if (payloads.length > 0) {
        await db.documents.update(documentId, {
          content: nextContent,
          isDirty: true,
          updatedAt: new Date().toISOString(),
        });
        syncEngine.requestSync(documentId);
      }
    },
    [documentId, userId, localDoc],
  );

  const recordRename = useCallback(
    async (title: string) => {
      if (!localDoc) return;
      const payload: OperationPayload = { kind: "rename", title };
      await enqueueOperation({
        documentId,
        userId,
        type: "RENAME",
        payload,
        baseVersion: localDoc.serverVersion,
      });
      await db.documents.update(documentId, {
        title,
        isDirty: true,
        updatedAt: new Date().toISOString(),
      });
      syncEngine.requestSync(documentId);
    },
    [documentId, userId, localDoc],
  );

  return {
    localDoc,
    isLoading: isHydrating && !localDoc,
    notFoundOffline: notFoundOffline && !localDoc,
    recordChange,
    recordRename,
  };
}
