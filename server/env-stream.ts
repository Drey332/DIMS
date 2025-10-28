import type { Request, Response } from "express";
import { buildContextFromSnapshot, gatherIndicators, FALLBACK_INDICATORS, type IndicatorSnapshot } from "./env-intel";
import type { EnvContext } from "@shared/types/env";

const DEFAULT_POLL_MS = Number(process.env.ENV_POLL_MS ?? 30_000);
const DEFAULT_HEARTBEAT_MS = Number(process.env.ENV_HEARTBEAT_MS ?? 15_000);
const DEFAULT_REBROADCAST_MS = Number(process.env.ENV_REBROADCAST_MS ?? 60_000);
const DEFAULT_BACKOFF_MAX_MS = Number(process.env.ENV_BACKOFF_MAX_MS ?? 300_000);

export type EnvStreamStatus = "live" | "stale" | "error";

interface StreamClient {
  req: Request;
  res: Response;
}

interface StreamState {
  key: string;
  lat: number;
  lon: number;
  radiusKm: number;
  clients: Set<StreamClient>;
  lastContext?: EnvContext;
  lastHash?: string;
  lastBroadcastAt?: number;
  pollTimer?: NodeJS.Timeout;
  heartbeatTimer?: NodeJS.Timeout;
  rebroadcastTimer?: NodeJS.Timeout;
  pollPromise?: Promise<void> | null;
  failureCount: number;
}

interface Logger {
  warn: (message: string, err?: unknown) => void;
  error: (message: string, err?: unknown) => void;
}

export interface EnvStreamOptions {
  pollIntervalMs?: number;
  heartbeatMs?: number;
  rebroadcastMs?: number;
  backoffMaxMs?: number;
  gather?: (lat: number, lon: number, radiusKm: number) => Promise<IndicatorSnapshot>;
  build?: (lat: number, lon: number, snapshot: IndicatorSnapshot | null) => EnvContext;
  logger?: Partial<Logger>;
}

export class EnvStreamManager {
  private readonly states = new Map<string, StreamState>();
  private readonly pollIntervalMs: number;
  private readonly heartbeatMs: number;
  private readonly rebroadcastMs: number;
  private readonly backoffMaxMs: number;
  private readonly gatherImpl: Required<EnvStreamOptions>["gather"];
  private readonly buildImpl: Required<EnvStreamOptions>["build"];
  private readonly logger: Logger;

  constructor(options: EnvStreamOptions = {}) {
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_MS;
    this.heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
    this.rebroadcastMs = options.rebroadcastMs ?? DEFAULT_REBROADCAST_MS;
    this.backoffMaxMs = options.backoffMaxMs ?? DEFAULT_BACKOFF_MAX_MS;
    this.gatherImpl = options.gather ?? gatherIndicators;
    this.buildImpl = options.build ?? buildContextFromSnapshot;
    this.logger = {
      warn: options.logger?.warn ?? ((message: string, err?: unknown) => console.warn(message, err)),
      error: options.logger?.error ?? ((message: string, err?: unknown) => console.error(message, err)),
    };
  }

  handleStream(req: Request, res: Response, params: { lat: number; lon: number; radiusKm: number }): void {
    const { lat, lon, radiusKm } = params;
    const key = formatStreamKey(lat, lon, radiusKm);
    const state = this.ensureState(key, lat, lon, radiusKm);
    const client: StreamClient = { req, res };

    this.prepareResponse(res);
    state.clients.add(client);
    this.startTimers(state);

    if (state.lastContext) {
      this.writeEnvEvent(client, state.lastContext);
    }

    void this.triggerPoll(state, true);

    req.on("close", () => {
      this.removeClient(state, client);
    });
  }

  /** Allow tests to force a poll immediately. */
  async forcePoll(lat: number, lon: number, radiusKm: number): Promise<void> {
    const key = formatStreamKey(lat, lon, radiusKm);
    const state = this.states.get(key);
    if (!state) {
      return;
    }
    await this.triggerPoll(state, true);
  }

  private ensureState(key: string, lat: number, lon: number, radiusKm: number): StreamState {
    let state = this.states.get(key);
    if (!state) {
      state = {
        key,
        lat,
        lon,
        radiusKm,
        clients: new Set(),
        failureCount: 0,
        pollPromise: null,
      };
      this.states.set(key, state);
    }
    return state;
  }

  private startTimers(state: StreamState): void {
    if (!state.heartbeatTimer) {
      state.heartbeatTimer = setInterval(() => {
        if (state.clients.size === 0) {
          return;
        }
        const timestamp = new Date().toISOString();
        for (const client of Array.from(state.clients)) {
          this.safeWrite(client, `event: heartbeat\ndata: ${timestamp}\n\n`);
        }
      }, this.heartbeatMs);
    }

    if (!state.rebroadcastTimer) {
      state.rebroadcastTimer = setInterval(() => {
        if (state.clients.size === 0 || !state.lastContext) {
          return;
        }
        const rebroadcastContext: EnvContext = {
          ...state.lastContext,
          fetched_at: new Date().toISOString(),
          indicators: { ...state.lastContext.indicators },
          key_risks: [...state.lastContext.key_risks],
          protective_measures: [...state.lastContext.protective_measures],
          rule_hits: state.lastContext.rule_hits ? [...state.lastContext.rule_hits] : undefined,
          stale: state.lastContext.stale ?? undefined,
        };
        this.broadcastContext(state, rebroadcastContext, { force: true });
      }, this.rebroadcastMs);
    }

    if (!state.pollTimer && !state.pollPromise) {
      state.pollTimer = setTimeout(() => {
        state.pollTimer = undefined;
        void this.triggerPoll(state, false);
      }, 0);
    }
  }

  private async triggerPoll(state: StreamState, immediate: boolean): Promise<void> {
    if (state.pollPromise) {
      return state.pollPromise;
    }

    const pollPromise = this.executePoll(state).finally(() => {
      state.pollPromise = null;
      if (state.clients.size === 0) {
        return;
      }
      const delay = this.computeNextDelay(state);
      state.pollTimer = setTimeout(() => {
        state.pollTimer = undefined;
        void this.triggerPoll(state, false);
      }, delay);
    });

    state.pollPromise = pollPromise;

    if (immediate && state.pollTimer) {
      clearTimeout(state.pollTimer);
      state.pollTimer = undefined;
    }

    return pollPromise;
  }

  private async executePoll(state: StreamState): Promise<void> {
    try {
      const snapshot = await this.gatherImpl(state.lat, state.lon, state.radiusKm);
      const context = this.buildImpl(state.lat, state.lon, snapshot);
      const hadErrors = snapshot.feedErrors.length > 0;
      if (hadErrors) {
        state.failureCount = Math.min(state.failureCount + 1, 6);
      } else {
        state.failureCount = 0;
      }
      this.broadcastContext(state, context, { force: hadErrors });
    } catch (error) {
      this.logger.warn("env-stream poll failed", error);
      state.failureCount = Math.min(state.failureCount + 1, 6);
      const fallback = this.buildFallbackContext(state);
      this.broadcastContext(state, fallback, { force: true });
    }
  }

  private buildFallbackContext(state: StreamState): EnvContext {
    if (state.lastContext) {
      const ruleHits = new Set(state.lastContext.rule_hits ?? []);
      ruleHits.add("system.stale");
      ruleHits.add("system.fallback");
      return {
        ...state.lastContext,
        fetched_at: new Date().toISOString(),
        indicators: { ...state.lastContext.indicators },
        key_risks: [...state.lastContext.key_risks],
        protective_measures: [...state.lastContext.protective_measures],
        rule_hits: Array.from(ruleHits),
        stale: true,
      };
    }

    return this.buildImpl(state.lat, state.lon, {
      indicators: { ...FALLBACK_INDICATORS },
      feedErrors: ["system"],
    });
  }

  private broadcastContext(state: StreamState, context: EnvContext, options: { force?: boolean } = {}): void {
    if (state.clients.size === 0) {
      return;
    }

    const canonicalHash = this.hashContext(context);
    const now = Date.now();
    const force = options.force ?? false;
    const shouldSend =
      force ||
      !state.lastHash ||
      state.lastHash !== canonicalHash ||
      (state.lastBroadcastAt !== undefined && now - state.lastBroadcastAt >= this.rebroadcastMs);

    if (!shouldSend) {
      return;
    }

    const payload = JSON.stringify(context);
    for (const client of Array.from(state.clients)) {
      this.safeWrite(client, `event: env\ndata: ${payload}\n\n`);
    }

    state.lastBroadcastAt = now;
    state.lastHash = canonicalHash;
    state.lastContext = this.cloneContext(context);
  }

  private safeWrite(client: StreamClient, chunk: string): void {
    try {
      client.res.write(chunk);
    } catch (error) {
      this.logger.warn("env-stream write failed", error);
      this.removeClientByInstance(client);
    }
  }

  private removeClient(state: StreamState, client: StreamClient): void {
    state.clients.delete(client);
    if (state.clients.size === 0) {
      this.teardownState(state);
    }
  }

  private removeClientByInstance(client: StreamClient): void {
    for (const state of Array.from(this.states.values())) {
      if (state.clients.has(client)) {
        this.removeClient(state, client);
        break;
      }
    }
  }

  private teardownState(state: StreamState): void {
    if (state.pollTimer) {
      clearTimeout(state.pollTimer);
      state.pollTimer = undefined;
    }
    if (state.heartbeatTimer) {
      clearInterval(state.heartbeatTimer);
      state.heartbeatTimer = undefined;
    }
    if (state.rebroadcastTimer) {
      clearInterval(state.rebroadcastTimer);
      state.rebroadcastTimer = undefined;
    }
    state.pollPromise = null;
    this.states.delete(state.key);
  }

  private computeNextDelay(state: StreamState): number {
    const exponent = Math.min(state.failureCount, 6);
    const factor = 2 ** exponent;
    return Math.min(this.backoffMaxMs, this.pollIntervalMs * Math.max(1, factor));
  }

  private hashContext(ctx: EnvContext): string {
    const { fetched_at: _ignored, ...rest } = ctx;
    return JSON.stringify(rest);
  }

  private cloneContext(ctx: EnvContext): EnvContext {
    return {
      ...ctx,
      indicators: { ...ctx.indicators },
      key_risks: [...ctx.key_risks],
      protective_measures: [...ctx.protective_measures],
      rule_hits: ctx.rule_hits ? [...ctx.rule_hits] : undefined,
      stale: ctx.stale ?? undefined,
    };
  }

  private prepareResponse(res: Response): void {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    res.write(`: env-stream connected ${Date.now()}\n\n`);
  }

  private writeEnvEvent(client: StreamClient, context: EnvContext): void {
    const payload = JSON.stringify(context);
    this.safeWrite(client, `event: env\ndata: ${payload}\n\n`);
  }
}

export function formatStreamKey(lat: number, lon: number, radiusKm: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)},${radiusKm.toFixed(1)}`;
}

export const envStreamManager = new EnvStreamManager();
