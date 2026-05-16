import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INCIDENT_ANALYSIS_VERSION,
  analyzeIncident,
  calculateScientificRiskAssessment,
  generateEvidenceCards,
  generateLowResourcePlan,
  type Incident,
} from "./index";

const lowRiskObservation: Incident = {
  id: "obs-low",
  title: "Housekeeping observation",
  description:
    "Loose cable was identified, isolated, marked, and corrected during a routine deck walkthrough before work started.",
  category: "Observation",
  attachments: ["deck-photo.jpg"],
  location: "Deck A",
  date: "2026-05-15T10:00:00.000Z",
};

const criticalFieldIncident: Incident = {
  id: "inc-critical",
  title: "Mayday fire and gas leak offshore",
  description:
    "Mayday life-threatening fire, explosion risk, gas leak, multiple crew exposed in a confined engine room on the offshore platform with unknown sensor state and no internet.",
  category: "Accident",
  fatalities: 1,
  injuries: 2,
  environmentalImpact: true,
  equipmentDamage: true,
  highPotentialNearMiss: true,
  attachments: [],
  resourceConstraints: {
    connectivity: "offline",
    power: "critical",
    evacuationAccess: "blocked",
    medicalAccessMinutes: 120,
    languageCoverage: "unknown",
  },
};

describe("evidence-informed incident analysis", () => {
  it("bands low and critical incidents using deterministic risk scoring", () => {
    const lowRisk = calculateScientificRiskAssessment({ ...lowRiskObservation });
    const criticalRisk = calculateScientificRiskAssessment({ ...criticalFieldIncident });

    assert.equal(lowRisk.band, "LOW");
    assert.ok(lowRisk.score < 38);
    assert.equal(criticalRisk.band, "CRITICAL");
    assert.ok(criticalRisk.score >= 82);
  });

  it("sorts dominant risk drivers in descending score order", () => {
    const risk = calculateScientificRiskAssessment({ ...criticalFieldIncident });

    assert.ok(risk.drivers.length > 0);
    assert.ok(risk.drivers[0].score >= risk.drivers[1].score);
    assert.ok(risk.drivers.map((driver) => driver.factor).includes("Resource strain"));
  });

  it("generates evidence cards that preserve action count and source rationale", () => {
    const risk = calculateScientificRiskAssessment({ ...criticalFieldIncident });
    const actions = [
      "Raise alarm, make the scene safe, and provide casualty triage.",
      "Isolate damaged equipment and confirm ignition controls.",
    ];
    const cards = generateEvidenceCards(criticalFieldIncident, actions, risk);

    assert.equal(cards.length, actions.length);
    assert.equal(cards[0].sources.some((source) => source.type === "ERP"), true);
    assert.match(cards[0].lowResourceAdaptation.toLowerCase(), /offline/);
  });

  it("selects offline-critical low-resource mode when field constraints are severe", () => {
    const risk = calculateScientificRiskAssessment({ ...criticalFieldIncident });
    const plan = generateLowResourcePlan(criticalFieldIncident, risk);

    assert.equal(plan.mode, "offline-critical");
    assert.ok(plan.minimumDataSet.includes("Incident ID and last-updated time"));
    assert.ok(plan.syncPolicy.length > 0);
  });

  it("returns the public incident analysis contract", async () => {
    const analysis = await analyzeIncident(criticalFieldIncident);

    assert.equal(analysis.analysisVersion, INCIDENT_ANALYSIS_VERSION);
    assert.equal(typeof analysis.generatedAt, "string");
    assert.equal(analysis.severity.tier, 3);
    assert.equal(analysis.evidenceCards.length, analysis.actions.length);
    assert.equal(analysis.reportStructure.coverPage.incidentId, criticalFieldIncident.id);
  });
});
