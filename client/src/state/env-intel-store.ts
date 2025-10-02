import { create } from "zustand";
import type { EnvContext } from "@shared/types/env";

export type EnvIntelStatus = "idle" | "connecting" | "live" | "stale" | "reconnecting" | "offline";

interface EnvIntelState {
  contexts: Record<string, EnvContext>;
  statuses: Record<string, EnvIntelStatus>;
  heartbeats: Record<string, number | null>;
  setContext: (key: string, context: EnvContext) => void;
  setStatus: (key: string, status: EnvIntelStatus) => void;
  setHeartbeat: (key: string, timestamp: number) => void;
  clearKey: (key: string) => void;
}

export const envIntelStore = create<EnvIntelState>((set) => ({
  contexts: {},
  statuses: {},
  heartbeats: {},
  setContext: (key, context) =>
    set((state) => ({
      contexts: { ...state.contexts, [key]: context },
    })),
  setStatus: (key, status) =>
    set((state) => ({
      statuses: { ...state.statuses, [key]: status },
    })),
  setHeartbeat: (key, timestamp) =>
    set((state) => ({
      heartbeats: { ...state.heartbeats, [key]: timestamp },
    })),
  clearKey: (key) =>
    set((state) => {
      const { [key]: _ctx, ...contexts } = state.contexts;
      const { [key]: _status, ...statuses } = state.statuses;
      const { [key]: _hb, ...heartbeats } = state.heartbeats;
      return { contexts, statuses, heartbeats };
    }),
}));

export const useEnvIntelStore = envIntelStore;
