import {
  SYNC_POLL_INTERVAL_MS,
  SYNC_RETRY_BASE_DELAY_MS,
  SYNC_RETRY_MAX_ATTEMPTS,
  SYNC_RETRY_MAX_DELAY_MS,
} from "@/constants";
import { db } from "@/lib/offline/db";
import {
  pullOperations,
  pushOperations,
  SyncApiError,
} from "@/lib/sync-engine/api-client";
import { networkMonitor } from "@/lib/sync-engine/network-monitor";
import {
  getPendingBatch,
  getPendingCount,
  markFailed,
  markSending,
  removeOperations,
  toWireFormat,
} from "@/lib/sync-engine/operation-queue";
import { tabSyncChannel } from "@/lib/sync-engine/tab-sync";
import type { SyncEngineState, SyncPhase } from "@/types/sync";

const PUSH_BATCH_SIZE = 100;

type StateListener = (state: SyncEngineState) => void;
type RemoteUpdateListener = (
  documentId: string,
  content: string,
  version: number,
) => void;

/**
 * Orchestrates the full local-first sync lifecycle for one browser session:
 *
 *   enqueue (instant, local) → debounce → push batch → server OT-merges →
 *   drain outbox → pull any operations from other clients → notify UI.
 *
 * Exponential backoff with jitter protects the server from thundering-herd
 * retries after an outage, while the Broadcast Channel leader election
 * ensures only one tab per browser actually drives the network calls.
 */
export class SyncEngine {
  private state: SyncEngineState = {
    networkStatus: networkMonitor.status,
    phase: "idle",
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,
  };

  private stateListeners = new Set<StateListener>();
  private remoteUpdateListeners = new Set<RemoteUpdateListener>();
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private retryAttempt = 0;
  private stopFns: Array<() => void> = [];
  private inFlight = false;
  private disposed = false;

  start(): () => void {
    this.stopFns.push(networkMonitor.start());
    this.stopFns.push(tabSyncChannel.start());

    this.stopFns.push(
      networkMonitor.onChange((status) => {
        this.updateState({
          networkStatus: status,
          phase: status === "offline" ? "offline" : "idle",
        });
        if (status === "online") void this.syncAllDirtyDocuments();
      }),
    );

    this.pollTimer = setInterval(() => {
      if (tabSyncChannel.isLeader() && networkMonitor.status === "online") {
        void this.syncAllDirtyDocuments();
      }
    }, SYNC_POLL_INTERVAL_MS);

    void this.refreshPendingCount();
    if (networkMonitor.status === "online") void this.syncAllDirtyDocuments();

    return () => {
      this.disposed = true;
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.stopFns.forEach((fn) => fn());
      this.stopFns = [];
    };
  }

  subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  onRemoteUpdate(listener: RemoteUpdateListener): () => void {
    this.remoteUpdateListeners.add(listener);
    return () => this.remoteUpdateListeners.delete(listener);
  }

  getState(): SyncEngineState {
    return this.state;
  }

  /** Called by the editor whenever a new local operation is enqueued. */
  requestSync(documentId: string): void {
    void this.refreshPendingCount();
    if (networkMonitor.status === "online") {
      void this.syncDocument(documentId);
    }
  }

  async syncAllDirtyDocuments(): Promise<void> {
    const dirtyDocs = await db.documents.filter((d) => d.isDirty).toArray();
    const documentIds = new Set(dirtyDocs.map((d) => d.id));

    const uniqueOutboxDocIds = await db.outbox.orderBy("documentId").uniqueKeys();
    for (const docId of uniqueOutboxDocIds) {
      documentIds.add(String(docId));
    }

    for (const documentId of documentIds) {
      await this.syncDocument(documentId);
    }
  }

  async syncDocument(documentId: string): Promise<void> {
    if (this.inFlight || this.disposed) return;
    this.inFlight = true;
    this.updateState({ phase: "syncing" satisfies SyncPhase });

    try {
      await this.pushPendingOperations(documentId);
      await this.pullRemoteOperations(documentId);
      this.retryAttempt = 0;
      this.updateState({
        phase: "idle",
        lastError: null,
        lastSyncedAt: new Date().toISOString(),
      });
      tabSyncChannel.post({ type: "document-synced", documentId, version: 0 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      this.updateState({ phase: "error", lastError: message });
      this.scheduleRetry(documentId, error);
    } finally {
      this.inFlight = false;
      await this.refreshPendingCount();
    }
  }

  private async pushPendingOperations(documentId: string): Promise<void> {
    let batch = await getPendingBatch(documentId, PUSH_BATCH_SIZE);

    while (batch.length > 0) {
      const operationIds = batch.map((op) => op.operationId);
      await markSending(operationIds);

      try {
        const response = await pushOperations({
          documentId,
          operations: batch.map(toWireFormat),
        });

        await removeOperations(operationIds);
        await this.applyServerState(
          documentId,
          response.serverVersion,
          response.serverContent,
        );
      } catch (error) {
        if (error instanceof SyncApiError && !error.retryable) {
          // Non-retryable (validation/forbidden): drop the offending batch
          // rather than looping forever, and surface the error to the UI.
          await removeOperations(operationIds);
        }
        throw error;
      }

      batch = await getPendingBatch(documentId, PUSH_BATCH_SIZE);
    }
  }

  private async pullRemoteOperations(documentId: string): Promise<void> {
    const local = await db.documents.get(documentId);
    const sinceVersion = local?.serverVersion ?? 0;
    const response = await pullOperations(documentId, sinceVersion);

    if (response.currentVersion === sinceVersion) return;

    const stillPending = await getPendingCount(documentId);
    await this.applyServerState(
      documentId,
      response.currentVersion,
      response.content,
      response.contentJson,
    );

    if (stillPending === 0) {
      this.remoteUpdateListeners.forEach((listener) =>
        listener(documentId, response.content, response.currentVersion),
      );
    }
  }

  private async applyServerState(
    documentId: string,
    version: number,
    content: string,
    contentJson?: unknown,
  ): Promise<void> {
    const remainingPending = await getPendingCount(documentId);
    await db.documents.update(documentId, {
      serverVersion: version,
      content,
      ...(contentJson !== undefined ? { contentJson } : {}),
      isDirty: remainingPending > 0,
      updatedAt: new Date().toISOString(),
    });
  }

  private scheduleRetry(documentId: string, error: unknown): void {
    if (error instanceof SyncApiError && !error.retryable) return;

    this.retryAttempt = Math.min(this.retryAttempt + 1, SYNC_RETRY_MAX_ATTEMPTS);
    const exponential = SYNC_RETRY_BASE_DELAY_MS * 2 ** (this.retryAttempt - 1);
    const capped = Math.min(exponential, SYNC_RETRY_MAX_DELAY_MS);
    const jitter = capped * (0.5 + Math.random() * 0.5);

    setTimeout(() => {
      if (!this.disposed && networkMonitor.status === "online") {
        void this.syncDocument(documentId);
      }
    }, jitter);
  }

  private async refreshPendingCount(): Promise<void> {
    const pendingCount = await getPendingCount();
    this.updateState({ pendingCount });
  }

  private updateState(partial: Partial<SyncEngineState>): void {
    this.state = { ...this.state, ...partial };
    this.stateListeners.forEach((listener) => listener(this.state));
  }
}

export const syncEngine = new SyncEngine();

/** Records a failed operation for observability (used by retry-queue tests). */
export async function recordOperationFailure(
  operationId: string,
  error: string,
  backoffMs: number,
) {
  await markFailed(operationId, error, Date.now() + backoffMs);
}
