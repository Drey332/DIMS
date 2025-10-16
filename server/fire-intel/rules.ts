export type Telemetry = {
  gasPpm?: number;
  delugeReady?: boolean;
  eStopHealthy?: boolean;
  bopMode?: "closed" | "open" | "unknown";
  negPressureTest?: "pass" | "fail" | "ambiguous" | "not_applicable";
  flareStatus?: "available" | "down";
  simultaneousOps?: boolean;
  hotWorkActive?: boolean;
  permitIsolationVerified?: boolean;
};

export type FireOperationPhase =
  | "production"
  | "drilling"
  | "completion"
  | "maintenance";

export interface FireRiskResult {
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number;
  findings: string[];
}

export function evaluateFireRisk(phase: FireOperationPhase, telemetry: Telemetry): FireRiskResult {
  const findings: string[] = [];
  let score = 0;

  if (phase === "production") {
    if (telemetry.delugeReady === false) {
      findings.push("Deluge not ready during production (Piper Alpha lesson)");
      score += 4;
    }
    if (telemetry.hotWorkActive && !telemetry.permitIsolationVerified) {
      findings.push("Hot work without verified isolation (permit-to-work failure)");
      score += 5;
    }
    if (typeof telemetry.gasPpm === "number" && telemetry.gasPpm > 20) {
      findings.push("Elevated gas reading >20 ppm — treat as leak until proven safe");
      score += 3;
    }
  }

  if (phase === "completion") {
    if (telemetry.negPressureTest === "ambiguous" || telemetry.negPressureTest === "fail") {
      findings.push("Negative pressure test not clearly passing — DO NOT displace, shut in well.");
      score += 6;
    }
    if (telemetry.bopMode && telemetry.bopMode !== "closed") {
      findings.push("BOP not closed during anomaly — shut in immediately");
      score += 4;
    }
  }

  if (telemetry.eStopHealthy === false) {
    findings.push("E-stop / isolation degraded");
    score += 3;
  }
  if (telemetry.flareStatus === "down") {
    findings.push("Flare not available — no safe disposal path");
    score += 2;
  }
  if (telemetry.simultaneousOps) {
    findings.push("SIMOPS active — raise supervision level");
    score += 1;
  }

  const level = score >= 8 ? "CRITICAL" : score >= 4 ? "HIGH" : score >= 2 ? "MEDIUM" : "LOW";
  return { level, score, findings };
}
