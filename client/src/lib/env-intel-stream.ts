import type { EnvContext } from "@shared/types/env";
import { envIntelStore, type EnvIntelStatus } from "@/state/env-intel-store";

interface SubscribeOptions {
  key: string;
  lat: number;
  lon: number;
  radiusKm: number;
}

interface ConnectionState {
  key: string;
  lat: number;
  lon: number;
  radiusKm: number;
  source: EventSource;
  refCount: number;
  lastHeartbeat: number | null;
  requestedCache: boolean;
}

const connections = new Map<string, ConnectionState>();
let swListenerInstalled = false;
let networkListenersInstalled = false;

export function makeEnvIntelKey(lat: number, lon: number, radiusKm: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)},${radiusKm.toFixed(1)}`;
}

export function subscribeEnvIntel(options: SubscribeOptions): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  ensureServiceWorkerListener();
  ensureNetworkListeners();

  const { key, lat, lon, radiusKm } = options;
  let state = connections.get(key);

  if (!state) {
    const url = new URL("/api/env-context/stream", window.location.origin);
    url.searchParams.set("lat", lat.toString());
    url.searchParams.set("lon", lon.toString());
    url.searchParams.set("radius_km", radiusKm.toString());

    const source = new EventSource(url.toString());
    state = {
      key,
      lat,
      lon,
      radiusKm,
      source,
      refCount: 0,
      lastHeartbeat: null,
      requestedCache: false,
    };
    connections.set(key, state);

    envIntelStore.getState().setStatus(key, "connecting");

    source.addEventListener("open", () => {
      const ctx = envIntelStore.getState().contexts[key];
      const status: EnvIntelStatus = ctx?.stale ? "stale" : "live";
      envIntelStore.getState().setStatus(key, status);
    });

    source.addEventListener("env", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as EnvContext;
        envIntelStore.getState().setContext(key, payload);
        envIntelStore.getState().setStatus(key, payload.stale ? "stale" : "live");
        envIntelStore.getState().setHeartbeat(key, Date.now());
        cacheSnapshot(key, payload);
      } catch (error) {
        console.warn("Failed to parse env intel payload", error);
      }
    });

    source.addEventListener("heartbeat", () => {
      envIntelStore.getState().setHeartbeat(key, Date.now());
    });

    source.onerror = () => {
      const status: EnvIntelStatus = navigator.onLine ? "reconnecting" : "offline";
      envIntelStore.getState().setStatus(key, status);
    };
  }

  state.refCount += 1;

  if (!state.requestedCache) {
    requestCachedSnapshot(key);
    state.requestedCache = true;
  }

  return () => {
    const current = connections.get(key);
    if (!current) return;
    current.refCount -= 1;
    if (current.refCount <= 0) {
      current.source.close();
      connections.delete(key);
      envIntelStore.getState().setStatus(key, "idle");
    }
  };
}

function cacheSnapshot(key: string, payload: EnvContext): void {
  if (!navigator.serviceWorker?.controller) {
    return;
  }
  try {
    navigator.serviceWorker.controller.postMessage({
      type: "env-intel:update",
      key,
      payload,
    });
  } catch (error) {
    console.warn("Failed to post env intel update to service worker", error);
  }
}

function requestCachedSnapshot(key: string): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  navigator.serviceWorker
    .ready
    .then((registration) => {
      const controller = navigator.serviceWorker.controller ?? registration.active;
      controller?.postMessage({ type: "env-intel:request", key });
    })
    .catch(() => {
      /* ignore */
    });
}

function ensureServiceWorkerListener(): void {
  if (swListenerInstalled || typeof navigator === "undefined") {
    return;
  }
  navigator.serviceWorker?.addEventListener("message", (event) => {
    const data = (event.data ?? {}) as { type?: string; key?: string; payload?: EnvContext };
    if (data.type !== "env-intel:cached" || !data.key) {
      return;
    }
    if (!connections.has(data.key)) {
      return;
    }
    const existing = envIntelStore.getState().contexts[data.key];
    if (!existing && data.payload) {
      envIntelStore.getState().setContext(data.key, data.payload);
      envIntelStore.getState().setStatus(data.key, data.payload.stale ? "stale" : "offline");
    } else if (!existing) {
      envIntelStore.getState().setStatus(data.key, "offline");
    }
  });
  swListenerInstalled = true;
}

function ensureNetworkListeners(): void {
  if (networkListenersInstalled || typeof window === "undefined") {
    return;
  }
  window.addEventListener("offline", () => {
    for (const key of Array.from(connections.keys())) {
      envIntelStore.getState().setStatus(key, "offline");
    }
  });
  window.addEventListener("online", () => {
    for (const key of Array.from(connections.keys())) {
      const ctx = envIntelStore.getState().contexts[key];
      envIntelStore.getState().setStatus(key, ctx?.stale ? "stale" : "reconnecting");
    }
  });
  networkListenersInstalled = true;
}
