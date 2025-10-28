import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildEnvContext, evaluateIndicators } from "../env-intel";
import type { EnvIndicators } from "@shared/types/env";

describe("evaluateIndicators", () => {
  test("kp >= 7 escalates to high", () => {
    const indicators: EnvIndicators = {
      kp_index: 7.2,
      quakes_24h_count: 0,
      strongest_quake_mag: null,
    };

    const result = evaluateIndicators(indicators);
    assert.equal(result.risk_level, "high");
    assert(result.key_risks.some((risk) => risk.includes("geomagnetic")));
    assert(result.rule_hits.includes("kp.severe"));
  });

  test("no feeds defaults to low risk with fallback measure", () => {
    const indicators: EnvIndicators = {
      kp_index: null,
      quakes_24h_count: 0,
      strongest_quake_mag: null,
    };

    const result = evaluateIndicators(indicators);
    assert.equal(result.risk_level, "low");
    assert(result.protective_measures.some((measure) => measure.includes("Kp feed unavailable")));
    assert(result.rule_hits.includes("kp.feed_missing"));
  });

  test("strong quake >= 6.5 triggers high", () => {
    const indicators: EnvIndicators = {
      kp_index: 3,
      quakes_24h_count: 1,
      strongest_quake_mag: 6.7,
    };

    const result = evaluateIndicators(indicators);
    assert.equal(result.risk_level, "high");
    assert(result.key_risks.some((risk) => risk.includes("strong regional earthquake")));
    assert(result.rule_hits.includes("quake.strong"));
  });

  test("three quakes >= 4.5 escalate to medium", () => {
    const indicators: EnvIndicators = {
      kp_index: 2,
      quakes_24h_count: 3,
      strongest_quake_mag: 4.6,
    };

    const result = evaluateIndicators(indicators);
    assert.equal(result.risk_level === "medium" || result.risk_level === "high", true);
    assert(result.rule_hits.includes("quake.swarm"));
  });
});

describe("buildEnvContext", () => {
  test("erp note includes protective measures", () => {
    const indicators: EnvIndicators = {
      kp_index: 5.3,
      quakes_24h_count: 2,
      strongest_quake_mag: 5.1,
    };

    const ctx = buildEnvContext(10, 20, indicators);
    assert.match(ctx.erp_note_md, /Protective measures/);
    assert.equal(ctx.lat, 10);
    assert.equal(ctx.lon, 20);
    assert(ctx.rule_hits && ctx.rule_hits.length > 0);
  });

  test("stale contexts include stale flag and guidance", () => {
    const indicators: EnvIndicators = {
      kp_index: null,
      quakes_24h_count: 0,
      strongest_quake_mag: null,
    };

    const ctx = buildEnvContext(0, 0, indicators, {
      stale: true,
      additionalRuleHits: ["system.fallback"],
    });

    assert.equal(ctx.stale, true);
    assert(ctx.rule_hits?.includes("system.fallback"));
    assert(ctx.protective_measures.some((measure) => measure.includes("stale")));
    assert.match(ctx.erp_note_md, /Operating on cached context/);
  });
});
