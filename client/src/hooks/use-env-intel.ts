import { useEffect, useMemo } from "react";
import type { EnvContext } from "@shared/types/env";
import { useEnvIntelStore, type EnvIntelStatus } from "@/state/env-intel-store";
import { makeEnvIntelKey, subscribeEnvIntel } from "@/lib/env-intel-stream";

export interface UseEnvIntelResult {
  key?: string;
  context: EnvContext | null;
  status: EnvIntelStatus;
  heartbeat: number | null;
  hasCoordinates: boolean;
}

export function useEnvIntelContext(lat?: number, lon?: number, radiusKm = 250): UseEnvIntelResult {
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);
  const key = useMemo(() => {
    if (!hasCoordinates || lat === undefined || lon === undefined) {
      return undefined;
    }
    return makeEnvIntelKey(lat, lon, radiusKm);
  }, [hasCoordinates, lat, lon, radiusKm]);

  const context = useEnvIntelStore((state) => (key ? state.contexts[key] ?? null : null));
  const status = useEnvIntelStore((state) => (key ? state.statuses[key] ?? "idle" : "idle"));
  const heartbeat = useEnvIntelStore((state) => (key ? state.heartbeats[key] ?? null : null));

  useEffect(() => {
    if (!key || lat === undefined || lon === undefined) {
      return;
    }
    return subscribeEnvIntel({ key, lat, lon, radiusKm });
  }, [key, lat, lon, radiusKm]);

  return {
    key,
    context,
    status,
    heartbeat,
    hasCoordinates,
  };
}
