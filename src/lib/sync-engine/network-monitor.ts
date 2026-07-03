import type { NetworkStatus } from "@/types/sync";

type Listener = (status: NetworkStatus) => void;

/**
 * Wraps the browser's connectivity signals with an *active* health check.
 * `navigator.onLine` only reflects whether the OS has a network interface
 * up — it can be `true` on a captive portal or dead Wi-Fi. We confirm real
 * reachability with a lightweight ping to our own `/api/health` endpoint
 * before ever declaring the app "online" again.
 */
export class NetworkMonitor {
  private listeners = new Set<Listener>();
  private currentStatus: NetworkStatus;
  private pingTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly pingIntervalMs = 10_000) {
    this.currentStatus =
      typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline";
  }

  get status(): NetworkStatus {
    return this.currentStatus;
  }

  start(): () => void {
    if (typeof window === "undefined") return () => {};

    const handleOnline = () => void this.verifyAndSet("online");
    const handleOffline = () => this.setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    this.pingTimer = setInterval(
      () => void this.verifyConnectivity(),
      this.pingIntervalMs,
    );
    void this.verifyConnectivity();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (this.pingTimer) clearInterval(this.pingTimer);
    };
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async verifyConnectivity() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setStatus("offline");
      return;
    }
    await this.verifyAndSet("online");
  }

  private async verifyAndSet(optimistic: NetworkStatus) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const response = await fetch("/api/health", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      this.setStatus(response.ok ? optimistic : "offline");
    } catch {
      this.setStatus("offline");
    }
  }

  private setStatus(status: NetworkStatus) {
    if (status === this.currentStatus) return;
    this.currentStatus = status;
    this.listeners.forEach((listener) => listener(status));
  }
}

export const networkMonitor = new NetworkMonitor();
