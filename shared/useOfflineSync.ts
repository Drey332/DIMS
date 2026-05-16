// shared/useOfflineSync.ts
import { useEffect, useState } from "react";

export type FieldMode = "normal" | "degraded" | "offline-critical";

export interface LowResourceConnectionState {
  online: boolean;
  mode: FieldMode;
  lastChangedAt: string;
  storageStatus: "unknown" | "ready" | "degraded";
  queuedRecords: number;
  replaying: boolean;
  lastQueueError?: string;
}

const FIELD_MODE_STORAGE_KEY = "hydrosafe:field-mode";
const OFFLINE_QUEUE_STORAGE_KEY = "hydrosafe:offline-queue";
const OFFLINE_QUEUE_SUMMARY_KEY = "hydrosafe:offline-queue-summary";

function readQueuedRecords(): number {
  if (typeof window === "undefined") return 0;
  try {
    const summaryRaw = window.localStorage.getItem(OFFLINE_QUEUE_SUMMARY_KEY);
    if (summaryRaw) {
      const summary = JSON.parse(summaryRaw);
      if (typeof summary?.queuedRecords === "number") return summary.queuedRecords;
    }
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function getLowResourceConnectionSnapshot(): LowResourceConnectionState {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  let queueSummary: { replaying?: boolean; lastError?: string } = {};
  try {
    const summaryRaw = typeof window === "undefined"
      ? undefined
      : window.localStorage.getItem(OFFLINE_QUEUE_SUMMARY_KEY);
    queueSummary = summaryRaw ? JSON.parse(summaryRaw) : {};
  } catch {
    queueSummary = {};
  }
  const storageStatus = typeof window === "undefined"
    ? "unknown"
    : window.localStorage.getItem("hydrosafe:offline-storage") === "ready"
      ? "ready"
      : window.localStorage.getItem("hydrosafe:offline-storage") === "degraded"
        ? "degraded"
        : "unknown";
  const queuedRecords = readQueuedRecords();

  return {
    online,
    mode: !online ? "offline-critical" : storageStatus === "degraded" || queuedRecords > 0 || queueSummary.replaying ? "degraded" : "normal",
    lastChangedAt: new Date().toISOString(),
    storageStatus,
    queuedRecords,
    replaying: Boolean(queueSummary.replaying),
    lastQueueError: queueSummary.lastError,
  };
}

function publishFieldModeState() {
  if (typeof window === "undefined") return;
  const snapshot = getLowResourceConnectionSnapshot();
  window.localStorage.setItem(FIELD_MODE_STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent("hydrosafe:field-mode-change", { detail: snapshot }));
}

export function useLowResourceConnection() {
  const [state, setState] = useState<LowResourceConnectionState>(() => getLowResourceConnectionSnapshot());

  useEffect(() => {
    function handleChange(event?: Event) {
      const customDetail = event instanceof CustomEvent ? event.detail : undefined;
      setState(customDetail ?? getLowResourceConnectionSnapshot());
    }

    window.addEventListener("hydrosafe:field-mode-change", handleChange);
    window.addEventListener("online", handleChange);
    window.addEventListener("offline", handleChange);
    window.addEventListener("storage", handleChange);
    publishFieldModeState();

    return () => {
      window.removeEventListener("hydrosafe:field-mode-change", handleChange);
      window.removeEventListener("online", handleChange);
      window.removeEventListener("offline", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  return state;
}

export function useEnableOfflineSync() {
  useEffect(() => {
    function handleOfflineFail(e: any) {
      console.warn("Offline persistence failed:", e.detail);
      window.localStorage.setItem("hydrosafe:offline-storage", "degraded");
      publishFieldModeState();
    }

    function handleOfflineReady() {
      window.localStorage.setItem("hydrosafe:offline-storage", "ready");
      publishFieldModeState();
    }

    function handleConnectionChange() {
      publishFieldModeState();
    }

    window.addEventListener("hydrosafe:offline-fail", handleOfflineFail);
    window.addEventListener("hydrosafe:offline-ready", handleOfflineReady);
    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);
    window.addEventListener("visibilitychange", handleConnectionChange);
    publishFieldModeState();

    return () => {
      window.removeEventListener("hydrosafe:offline-fail", handleOfflineFail);
      window.removeEventListener("hydrosafe:offline-ready", handleOfflineReady);
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
      window.removeEventListener("visibilitychange", handleConnectionChange);
    };
  }, []);
}
