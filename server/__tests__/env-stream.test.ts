import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { EventEmitter } from "node:events";
import type { Request, Response } from "express";
import type { EnvContext } from "@shared/types/env";
import { EnvStreamManager } from "../env-stream";
import type { IndicatorSnapshot } from "../env-intel";

type MockedResponse = Response & { chunks: string[] };

function createMockRequest(): Request {
  return new EventEmitter() as unknown as Request;
}

function createMockResponse(): MockedResponse {
  const emitter = new EventEmitter() as unknown as MockedResponse;
  emitter.chunks = [];
  emitter.statusCode = 200;
  emitter.headers = {} as Record<string, string>;
  emitter.status = function (code: number) {
    this.statusCode = code;
    return this;
  } as Response["status"];
  emitter.setHeader = function (name: string, value: string) {
    (this.headers as Record<string, string>)[name] = value;
    return this;
  } as Response["setHeader"];
  emitter.flushHeaders = function () {
    /* noop */
  } as Response["flushHeaders"];
  emitter.write = function (chunk: string) {
    this.chunks.push(chunk);
    return true;
  } as Response["write"];
  emitter.end = function () {
    return this;
  } as Response["end"];
  return emitter;
}

describe("EnvStreamManager", () => {
  test("broadcasts snapshot changes once", async () => {
    const snapshots: IndicatorSnapshot[] = [
      {
        indicators: { kp_index: 4, quakes_24h_count: 1, strongest_quake_mag: 3.2 },
        feedErrors: [],
      },
      {
        indicators: { kp_index: 4, quakes_24h_count: 1, strongest_quake_mag: 3.2 },
        feedErrors: [],
      },
    ];

    const manager = new EnvStreamManager({
      pollIntervalMs: 100,
      heartbeatMs: 10_000,
      rebroadcastMs: 10_000,
      gather: async () => snapshots.shift() ?? snapshots[0],
    });

    const req = createMockRequest();
    const res = createMockResponse();
    manager.handleStream(req, res, { lat: 10, lon: 20, radiusKm: 250 });

    await delay(150);

    const envEvents = res.chunks.filter((chunk) => chunk.startsWith("event: env"));
    assert.equal(envEvents.length, 1);

    req.emit("close");
  });

  test("emits heartbeat events", async () => {
    const manager = new EnvStreamManager({
      pollIntervalMs: 200,
      heartbeatMs: 20,
      rebroadcastMs: 10_000,
      gather: async () => ({
        indicators: { kp_index: 3, quakes_24h_count: 0, strongest_quake_mag: null },
        feedErrors: [],
      }),
    });

    const req = createMockRequest();
    const res = createMockResponse();
    manager.handleStream(req, res, { lat: 1, lon: 2, radiusKm: 250 });

    await delay(60);
    const heartbeatEvents = res.chunks.filter((chunk) => chunk.startsWith("event: heartbeat"));
    assert(heartbeatEvents.length >= 1);

    req.emit("close");
  });

  test("marks stale contexts when poll fails", async () => {
    const snapshots: (IndicatorSnapshot | Error)[] = [
      {
        indicators: { kp_index: 5, quakes_24h_count: 0, strongest_quake_mag: null },
        feedErrors: [],
      },
      new Error("feed down"),
    ];

    const manager = new EnvStreamManager({
      pollIntervalMs: 50,
      heartbeatMs: 10_000,
      rebroadcastMs: 10_000,
      gather: async () => {
        const next = snapshots.shift();
        if (!next) {
          return {
            indicators: { kp_index: 5, quakes_24h_count: 0, strongest_quake_mag: null },
            feedErrors: [],
          };
        }
        if (next instanceof Error) {
          throw next;
        }
        return next;
      },
    });

    const req = createMockRequest();
    const res = createMockResponse();
    manager.handleStream(req, res, { lat: 12.5, lon: -45.2, radiusKm: 250 });

    await delay(160);

    const envPayloads = res.chunks
      .filter((chunk) => chunk.startsWith("event: env"))
      .map((chunk) => {
        const dataLine = chunk.split("\n").find((line) => line.startsWith("data:"));
        return dataLine ? JSON.parse(dataLine.replace("data: ", "")) as EnvContext : null;
      })
      .filter((value): value is EnvContext => value !== null);

    assert(envPayloads.length >= 2);
    const stalePayload = envPayloads.find((payload) => payload.stale);
    assert(stalePayload, "expected a stale payload after feed failure");
    assert(stalePayload.rule_hits?.some((hit) => hit.startsWith("system")));

    req.emit("close");
  });

  test("rebroadcasts latest context on interval", async () => {
    let counter = 0;
    const manager = new EnvStreamManager({
      pollIntervalMs: 10_000,
      heartbeatMs: 10_000,
      rebroadcastMs: 40,
      gather: async () => ({
        indicators: { kp_index: counter++ + 1, quakes_24h_count: 0, strongest_quake_mag: null },
        feedErrors: [],
      }),
    });

    const req = createMockRequest();
    const res = createMockResponse();
    manager.handleStream(req, res, { lat: 0, lon: 0, radiusKm: 250 });

    await delay(20); // allow initial poll
    const before = res.chunks.filter((chunk) => chunk.startsWith("event: env")).length;

    await delay(60); // wait past rebroadcast interval
    const after = res.chunks.filter((chunk) => chunk.startsWith("event: env")).length;
    assert(after >= before + 1);

    req.emit("close");
  });
});
