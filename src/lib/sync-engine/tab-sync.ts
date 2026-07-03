/**
 * Cross-tab coordination via the Broadcast Channel API.
 *
 * Two responsibilities:
 *  1. When Tab A finishes syncing document X, tell Tab B (which might have
 *     the same document open, or the dashboard list) to refresh from Dexie
 *     instead of independently re-fetching from the network.
 *  2. Elect a single "sync leader" tab so N open tabs don't all hammer the
 *     API with redundant push/pull cycles for the same document — only the
 *     leader runs the interval-based sync loop; followers still enqueue
 *     local edits (writes are always local-first) but rely on the leader to
 *     flush them, and take over leadership immediately if it disappears.
 */
export type TabSyncMessage =
  | { type: "document-synced"; documentId: string; version: number }
  | { type: "leader-heartbeat"; tabId: string; timestamp: number }
  | { type: "leader-election-request" };

const CHANNEL_NAME = "nimbus-docs-sync";
const LEADER_TIMEOUT_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 2000;

export class TabSyncChannel {
  private channel: BroadcastChannel | undefined;
  private readonly tabId = crypto.randomUUID();
  private lastLeaderHeartbeat = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private listeners = new Set<(message: TabSyncMessage) => void>();

  start(): () => void {
    if (typeof BroadcastChannel === "undefined") return () => {};

    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event: MessageEvent<TabSyncMessage>) => {
      if (event.data.type === "leader-heartbeat") {
        this.lastLeaderHeartbeat = event.data.timestamp;
      }
      this.listeners.forEach((listener) => listener(event.data));
    };

    this.heartbeatTimer = setInterval(() => {
      if (this.isLeader()) {
        this.post({ type: "leader-heartbeat", tabId: this.tabId, timestamp: Date.now() });
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.channel?.close();
    };
  }

  /**
   * A tab considers itself leader if no other tab's heartbeat has been seen
   * recently. This is a lightweight, eventually-consistent election — good
   * enough here because being "leader" only controls who *initiates*
   * polling, not correctness (every tab still writes through the same
   * durable outbox, and the server is the actual arbiter of truth).
   */
  isLeader(): boolean {
    return Date.now() - this.lastLeaderHeartbeat > LEADER_TIMEOUT_MS;
  }

  post(message: TabSyncMessage): void {
    this.channel?.postMessage(message);
  }

  onMessage(listener: (message: TabSyncMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const tabSyncChannel = new TabSyncChannel();
