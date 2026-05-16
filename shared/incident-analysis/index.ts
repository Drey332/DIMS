// AI-Driven Incident Management Logic for HydroSafe
// This module provides intelligent incident classification, corrective action suggestions,
// documentation validation, and PDF report generation following HydroDive's ERP standards

// Define types for incident data
export interface Incident {
  id: string;
  title: string;
  description: string;
  category: 'Accident' | 'NearMiss' | 'Hazard' | 'Observation';
  severity?: number;           // Calculated severity tier (0-3)
  fatalities?: number;
  injuries?: number;           // count of injuries (excluding fatalities)
  environmentalImpact?: boolean;
  equipmentDamage?: boolean;
  highPotentialNearMiss?: boolean;  // flag if a near-miss with high potential consequences
  attachments: string[];       // list of attachment filenames or types
  location?: string;
  date?: string;
  involvedPersons?: string[];
  resourceConstraints?: ResourceConstraints;
}

export const INCIDENT_ANALYSIS_VERSION = "dims-science-v1";

// Input type for external usage
export type IncidentAnalysisInput = Pick<Incident, 'title' | 'description' | 'category'> & Partial<Incident>;
export type IncidentInput = IncidentAnalysisInput;

export type RiskBand = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type EvidenceLevel = 'DIRECT_PROTOCOL' | 'HISTORICAL_ANALOGY' | 'OPERATIONAL_HEURISTIC';
export type RecommendationConfidence = 'high' | 'medium' | 'low';

export interface ResourceConstraints {
  connectivity?: 'online' | 'intermittent' | 'offline';
  power?: 'stable' | 'limited' | 'critical';
  medicalAccessMinutes?: number;
  evacuationAccess?: 'available' | 'delayed' | 'blocked';
  languageCoverage?: 'single-language' | 'multilingual' | 'unknown';
}

export interface RiskDriver {
  factor: string;
  score: number;
  finding: string;
}

export interface ScientificRiskAssessment {
  score: number;
  band: RiskBand;
  confidence: RecommendationConfidence;
  likelihood: number;
  consequence: number;
  exposure: number;
  vulnerability: number;
  detectabilityGap: number;
  resourceStrain: number;
  drivers: RiskDriver[];
  uncertaintyFactors: string[];
  immediateThresholds: string[];
  assumptions: string[];
}

export interface EvidenceSource {
  title: string;
  type: 'ERP' | 'STANDARD' | 'HISTORICAL' | 'FIELD_DATA' | 'INFERENCE';
  reference?: string;
}

export interface EvidenceCard {
  id: string;
  action: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadline: string;
  evidenceLevel: EvidenceLevel;
  sources: EvidenceSource[];
  rationale: string;
  confidence: RecommendationConfidence;
  uncertainty: string;
  verification: string;
  lowResourceAdaptation: string;
}

export interface LowResourcePlan {
  mode: 'normal' | 'degraded' | 'offline-critical';
  triggers: string[];
  minimumDataSet: string[];
  communications: string[];
  offlineCache: string[];
  syncPolicy: string[];
  languageSupport: string[];
  fieldKit: string[];
}

export interface IncidentAnalysisResult {
  severity: { tier: number; escalation: string };
  risk: ScientificRiskAssessment;
  actions: string[];
  evidenceCards: EvidenceCard[];
  lowResourcePlan: LowResourcePlan;
  documentation: { complete: boolean; missingItems: string[] };
  reportStructure: ReportSections;
  analysisVersion: string;
  generatedAt: string;
}

// Configuration to toggle AI mode
const AI_CONFIG = {
  useOpenAI: false  // set true to enable OpenAI completion fallback
};

// Severity classification thresholds and mapping based on ERP Tier definitions
const SeverityTier = {
  TIER0: 0,  // Business as Usual (no significant impact)
  TIER1: 1,  // Tactical Response (minor disruption, managed on-site)
  TIER2: 2,  // Operational Response (project affected, requires Silver support)
  TIER3: 3   // Strategic Response (life-threatening or major incident, Gold level)
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function asRiskBand(score: number): RiskBand {
  if (score >= 82) return 'CRITICAL';
  if (score >= 62) return 'HIGH';
  if (score >= 38) return 'MODERATE';
  return 'LOW';
}

function asPriority(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 82) return 'CRITICAL';
  if (score >= 62) return 'HIGH';
  if (score >= 38) return 'MEDIUM';
  return 'LOW';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function getIncidentText(incident: Incident): string {
  return `${incident.title} ${incident.description} ${incident.location ?? ''}`.toLowerCase();
}

export function calculateScientificRiskAssessment(incident: Incident): ScientificRiskAssessment {
  const text = getIncidentText(incident);
  const severity = incident.severity ?? classifySeverity(incident).tier;
  const drivers: RiskDriver[] = [];
  const uncertaintyFactors: string[] = [];

  let consequence = [18, 36, 64, 88][severity] ?? 30;
  if ((incident.fatalities ?? 0) > 0) consequence += 12;
  if ((incident.injuries ?? 0) > 0) consequence += 9;
  if (incident.environmentalImpact) consequence += 7;
  if (incident.equipmentDamage) consequence += 6;
  if (includesAny(text, ['life-threatening', 'mayday', 'explosion', 'blowout', 'fire', 'gas leak'])) {
    consequence += 10;
  }
  consequence = clampScore(consequence);
  drivers.push({
    factor: 'Consequence',
    score: consequence,
    finding: `Potential consequence is aligned to Tier ${severity} response logic and incident descriptors.`,
  });

  let likelihood = incident.category === 'NearMiss' ? 38 : incident.category === 'Hazard' ? 42 : 32;
  if (incident.highPotentialNearMiss) likelihood += 24;
  if (includesAny(text, ['gas', 'leak', 'smoke', 'fire', 'explosion', 'spark', 'ignition'])) likelihood += 20;
  if (includesAny(text, ['weather', 'storm', 'wave', 'visibility', 'wind'])) likelihood += 12;
  if (includesAny(text, ['repeat', 'recurring', 'again', 'history', 'previous'])) likelihood += 12;
  likelihood = clampScore(likelihood);
  drivers.push({
    factor: 'Likelihood',
    score: likelihood,
    finding: 'Likelihood is estimated from event type, high-potential flags, and hazard keywords.',
  });

  let exposure = 24;
  if (incident.involvedPersons && incident.involvedPersons.length > 1) exposure += 14;
  if (includesAny(text, ['crew', 'team', 'multiple', 'vessel', 'platform', 'offshore', 'accommodation'])) exposure += 18;
  if (includesAny(text, ['confined', 'engine room', 'helideck', 'crane', 'lifting', 'dive'])) exposure += 16;
  exposure = clampScore(exposure);
  drivers.push({
    factor: 'Exposure',
    score: exposure,
    finding: 'Exposure reflects how many people, zones, and critical work fronts may be affected.',
  });

  let vulnerability = 26;
  if (includesAny(text, ['remote', 'low resource', 'limited', 'rural', 'offshore', 'medevac', 'night'])) vulnerability += 18;
  if (includesAny(text, ['contractor', 'new crew', 'fatigue', 'handover', 'language'])) vulnerability += 12;
  if ((incident.resourceConstraints?.medicalAccessMinutes ?? 0) > 45) vulnerability += 16;
  if (incident.resourceConstraints?.evacuationAccess === 'delayed') vulnerability += 14;
  if (incident.resourceConstraints?.evacuationAccess === 'blocked') vulnerability += 24;
  vulnerability = clampScore(vulnerability);
  drivers.push({
    factor: 'Vulnerability',
    score: vulnerability,
    finding: 'Vulnerability captures medical access, evacuation constraints, fatigue, handover, and remote operating conditions.',
  });

  let detectabilityGap = 22;
  if (!incident.description || incident.description.trim().length < 40) detectabilityGap += 18;
  if (!incident.location) detectabilityGap += 12;
  if (!incident.attachments || incident.attachments.length === 0) detectabilityGap += 14;
  if (includesAny(text, ['unknown', 'unconfirmed', 'suspected', 'possible', 'no sensor', 'not verified'])) detectabilityGap += 16;
  detectabilityGap = clampScore(detectabilityGap);
  drivers.push({
    factor: 'Detectability gap',
    score: detectabilityGap,
    finding: 'Detectability gap rises when location, sensor/photo evidence, or incident facts are incomplete.',
  });

  let resourceStrain = 18;
  if (incident.resourceConstraints?.connectivity === 'intermittent') resourceStrain += 16;
  if (incident.resourceConstraints?.connectivity === 'offline') resourceStrain += 28;
  if (incident.resourceConstraints?.power === 'limited') resourceStrain += 14;
  if (incident.resourceConstraints?.power === 'critical') resourceStrain += 26;
  if (incident.resourceConstraints?.languageCoverage !== undefined && incident.resourceConstraints.languageCoverage !== 'single-language') {
    resourceStrain += 10;
  }
  if (includesAny(text, ['offline', 'radio only', 'no internet', 'limited network', 'low resource'])) resourceStrain += 24;
  resourceStrain = clampScore(resourceStrain);
  drivers.push({
    factor: 'Resource strain',
    score: resourceStrain,
    finding: 'Resource strain estimates communication, power, language, and evacuation limitations.',
  });

  const score = clampScore(
    consequence * 0.34 +
    likelihood * 0.2 +
    exposure * 0.14 +
    vulnerability * 0.15 +
    detectabilityGap * 0.1 +
    resourceStrain * 0.07
  );

  if (!incident.location) uncertaintyFactors.push('Incident location is missing or not geocoded.');
  if (!incident.attachments || incident.attachments.length === 0) uncertaintyFactors.push('No photos, sensor data, or signed field notes are attached.');
  if (!incident.description || incident.description.trim().length < 40) uncertaintyFactors.push('Description is short; causal pathway is uncertain.');
  if (!incident.date) uncertaintyFactors.push('Incident timestamp/date was not supplied by the reporter.');
  if (!incident.resourceConstraints) uncertaintyFactors.push('Connectivity, power, evacuation, and language constraints were not assessed.');

  const confidence: RecommendationConfidence =
    uncertaintyFactors.length <= 1 ? 'high' : uncertaintyFactors.length <= 3 ? 'medium' : 'low';

  const immediateThresholds = unique([
    score >= 82 ? 'Gold command review within 5 minutes.' : '',
    score >= 62 ? 'Silver command must validate controls before work resumes.' : '',
    consequence >= 75 ? 'Stop affected operation until life-safety and isolation controls are confirmed.' : '',
    detectabilityGap >= 55 ? 'Field team must capture location, photo, and witness facts before closure.' : '',
    resourceStrain >= 55 ? 'Switch to low-resource communications and delayed-sync logging immediately.' : '',
  ]);

  return {
    score,
    band: asRiskBand(score),
    confidence,
    likelihood,
    consequence,
    exposure,
    vulnerability,
    detectabilityGap,
    resourceStrain,
    drivers: drivers.sort((a, b) => b.score - a.score),
    uncertaintyFactors,
    immediateThresholds,
    assumptions: [
      'Score is a decision-support estimate, not a replacement for command judgement.',
      'Weights prioritize life safety, escalation speed, and ability to verify facts in the field.',
      'Low-resource penalties are applied when connectivity, power, language, or evacuation constraints are known or implied.',
    ],
  };
}

export function classifySeverity(incident: Incident): { tier: number; escalation: string } {
  // Determine the incident severity tier (0–3) using rule-based criteria
  let tier = 0;
  let escalation = "None";  // default no escalation needed

  // Fatality or life-threatening situation -> Tier 3 (Strategic Response)
  if ((incident.fatalities && incident.fatalities > 0) ||
      (incident.description.toLowerCase().includes("life-threatening")) ||
      (incident.description.toLowerCase().includes("mayday"))) {
    tier = 3;
    escalation = "Gold Controller (Strategic Management)";
  }
  // Serious injury, major equipment/vessel damage, or high-potential near miss -> Tier 2
  else if ((incident.injuries && incident.injuries > 0) || incident.equipmentDamage === true ||
           incident.highPotentialNearMiss === true) {
    tier = 2;
    escalation = "Silver Controller (Operational Management)";
  }
  // Minor on-site incident (e.g. first aid case) causing some disruption -> Tier 1
  else if (incident.category === 'Accident' || incident.category === 'NearMiss') {
    // If it was an accident with no serious injury and minimal impact
    tier = 1;
    escalation = "On-scene Bronze (Handled on-site, notify HSE)";
  }
  // Hazard observation or no impact incident -> Tier 0
  else {
    tier = 0;
    escalation = "On-scene team (Monitor, business-as-usual)";
  }

  // Refine escalation based on tier (ERP dictates who leads at each level)
  if (tier >= SeverityTier.TIER2) {
    escalation = "Silver Controller";
  }
  if (tier >= SeverityTier.TIER3) {
    escalation = "Gold Controller (with full Emergency Response Team)";
  }

  // Attach the tier to incident for reference
  incident.severity = tier;
  return { tier, escalation };
}

export function suggestCorrectiveActions(incident: Incident): string[] {
  // Generate recommended corrective and preventive actions for the incident
  // These suggestions follow HydroDive ERP guidelines and industry best practices.
  const recommendations: string[] = [];

  // 1. Immediate on-site response actions (for accidents/incidents)
  if (incident.category === 'Accident' || incident.category === 'NearMiss') {
    recommendations.push(
      "Verify initial response steps were executed: raise alarm, make the scene safe, provide first aid/triage, and stabilize any casualties."
    );
    recommendations.push(
      "Confirm the On-Scene Coordinator (Bronze) has notified the Emergency Controller (Silver) and begun incident logging."
    );
  }

  // 2. Medical emergency specific actions
  if (incident.description.toLowerCase().includes("injury") || incident.description.toLowerCase().includes("medical")) {
    // Suggest medevac protocol if severe injury or if doctor is needed
    if (incident.severity && incident.severity >= SeverityTier.TIER2) {
      recommendations.push(
        "Initiate medevac procedure for injured personnel as needed and ensure on-board doctor/DMT stabilizes the casualty for transport."
      );
    }
    // Contact hyperbaric or specialized medical support if a diving-related injury
    if (incident.description.toLowerCase().includes("diver") || incident.description.toLowerCase().includes("dcs")) {
      recommendations.push(
        "Contact hyperbaric medical support (e.g., ISOS) for expert advice, and have the on-call doctor liaise with the on-scene team."
      );
    }
  }

  // 3. Containment and restoration actions for environmental or equipment incidents
  if (incident.environmentalImpact) {
    recommendations.push(
      "Contain and report any environmental release/spill immediately according to the spill response plan. Deploy cleanup resources and notify regulatory bodies if required."
    );
  }
  if (incident.equipmentDamage) {
    recommendations.push(
      "Isolate and lock out damaged equipment to prevent further harm. Perform a Failure Modes and Effects analysis to identify the cause of failure and schedule repair or replacement."
    );
  }

  // 4. Preventive / long-term actions based on severity
  if (incident.severity === SeverityTier.TIER0) {
    recommendations.push(
      "Issue a safety bulletin or flash to communicate the minor incident and lessons learned to the crew. Conduct a brief Time-Out-For-Safety to review relevant procedures."
    );
    recommendations.push(
      "Review and update the risk assessment for the task, and implement any minor changes needed to prevent recurrence."
    );
  }
  if (incident.severity === SeverityTier.TIER1) {
    recommendations.push(
      "Engage the HSE team to document the incident and develop lessons learned. Update training or toolbox talks for staff as needed."
    );
    recommendations.push(
      "Implement any quick corrective measures (e.g., improved PPE, signage, or procedure tweaks) to address the immediate cause."
    );
  }
  if (incident.severity === SeverityTier.TIER2) {
    recommendations.push(
      "Conduct a formal investigation and root cause analysis with involvement from the Silver level management. Include a procedural review to address any system or process failures."
    );
    recommendations.push(
      "Provide additional training or drills focused on the incident scenario to improve team readiness and prevent recurrence."
    );
    // High-potential near miss handling
    if (incident.highPotentialNearMiss) {
      recommendations.push(
        "Even though this was a near-miss, treat it as a high-potential incident: share the scenario and preventive measures company-wide (Safety Alert) and reinforce critical safety controls."
      );
    }
  }
  if (incident.severity === SeverityTier.TIER3) {
    recommendations.push(
      "Mobilize the full Emergency Response Team under Gold Controller leadership, and involve corporate management in the response."
    );
    recommendations.push(
      "Suspend operations if not already done. Preserve the scene for investigation and involve external authorities/regulators as appropriate."
    );
    recommendations.push(
      "Enforce communication control: route all external communications through the Silver/Gold controllers and legal/HSE advisors. Arrange for HR to support family notifications if there are serious injuries or fatalities."
    );
    recommendations.push(
      "Impose a social media blackout among project personnel to prevent misinformation, as per company policy."
    );
  }

  // 5. Hazard observation (no actual incident)
  if (incident.category === 'Hazard' || incident.category === 'Observation') {
    recommendations.push(
      "Take immediate action to eliminate or control the observed hazard (e.g., remove the unsafe condition or stop the unsafe practice)."
    );
    recommendations.push(
      "Log the observation in the hazard register and assign an action party to implement a permanent fix or improvement (engineering control, updated PPE, etc.)."
    );
    recommendations.push(
      "Communicate the observation and corrective actions to the team (e.g., in next safety meeting) to raise awareness and prevent potential incidents."
    );
  }

  // Use OpenAI completion for additional suggestions if enabled and needed
  if (AI_CONFIG.useOpenAI) {
    // This would integrate with the existing OpenAI service
    recommendations.push("Additional AI-generated recommendations would be added here when OpenAI integration is enabled.");
  }

  return recommendations;
}

function sourceSetForAction(action: string, incident: Incident): EvidenceSource[] {
  const text = `${action} ${getIncidentText(incident)}`;
  const sources: EvidenceSource[] = [
    {
      title: 'HydroDive Emergency Response Plan',
      type: 'ERP',
      reference: 'Bronze-Silver-Gold command hierarchy',
    },
  ];

  if (includesAny(text, ['medical', 'injury', 'casualty', 'medevac', 'dmt', 'doctor', 'diver', 'dcs'])) {
    sources.push({ title: 'IMCA diving and offshore medical emergency guidance', type: 'STANDARD', reference: 'Medical evacuation and diving emergency controls' });
  }
  if (includesAny(text, ['fire', 'explosion', 'gas', 'ignition', 'deluge', 'blowout'])) {
    sources.push({ title: 'Fire Aladdin historical fire incident knowledge base', type: 'HISTORICAL', reference: 'Piper Alpha / Deepwater Horizon barrier lessons' });
  }
  if (includesAny(text, ['equipment', 'lock out', 'failure', 'maintenance', 'inspection', 'isolate'])) {
    sources.push({ title: 'Asset integrity and isolation workflow', type: 'ERP', reference: 'Lockout, inspection, and failure mode review' });
  }
  if (includesAny(text, ['weather', 'sea', 'wind', 'helicopter', 'helideck'])) {
    sources.push({ title: 'Environmental operating limits', type: 'FIELD_DATA', reference: 'Weather, marine, and evacuation constraints' });
  }

  return sources;
}

function deadlineForAction(action: string, risk: ScientificRiskAssessment): string {
  const text = action.toLowerCase();
  if (includesAny(text, ['first aid', 'triage', 'life support', 'alarm', 'make the scene safe'])) return '<2 minutes';
  if (includesAny(text, ['notify', 'communicate', 'contact', 'silver'])) return '<5 minutes';
  if (includesAny(text, ['medevac', 'evacuation', 'helideck'])) return '<10 minutes decision, <25 minutes dispatch target';
  if (includesAny(text, ['isolate', 'lock out', 'contain'])) return '<10 minutes';
  if (includesAny(text, ['investigation', 'root cause', 'formal'])) return '<24 hours';
  if (risk.band === 'CRITICAL') return '<5 minutes command validation';
  if (risk.band === 'HIGH') return '<15 minutes command validation';
  return 'Before close-out';
}

function uncertaintyForAction(action: string, incident: Incident, risk: ScientificRiskAssessment): string {
  const uncertainties = [...risk.uncertaintyFactors];
  if (action.toLowerCase().includes('medevac') && !incident.location) {
    uncertainties.push('Evacuation route cannot be validated without location.');
  }
  if (action.toLowerCase().includes('equipment') && (!incident.attachments || incident.attachments.length === 0)) {
    uncertainties.push('Asset condition is not supported by photo or inspection evidence.');
  }
  return uncertainties[0] ?? 'Evidence is sufficient for an initial field decision.';
}

export function generateEvidenceCards(
  incident: Incident,
  actions: string[],
  risk: ScientificRiskAssessment
): EvidenceCard[] {
  return actions.map((action, index) => {
    const sources = sourceSetForAction(action, incident);
    const hasProtocol = sources.some((source) => source.type === 'ERP' || source.type === 'STANDARD');
    const hasHistorical = sources.some((source) => source.type === 'HISTORICAL');
    const evidenceLevel: EvidenceLevel = hasProtocol
      ? 'DIRECT_PROTOCOL'
      : hasHistorical
        ? 'HISTORICAL_ANALOGY'
        : 'OPERATIONAL_HEURISTIC';
    const priorityScore = Math.max(
      risk.score,
      action.toLowerCase().includes('immediate') || action.toLowerCase().includes('mobilize') ? 85 : 0,
      action.toLowerCase().includes('notify') || action.toLowerCase().includes('isolate') ? 70 : 0
    );

    return {
      id: `evidence-${index + 1}`,
      action,
      priority: asPriority(priorityScore),
      deadline: deadlineForAction(action, risk),
      evidenceLevel,
      sources,
      rationale: `Action selected because ${risk.drivers[0]?.factor.toLowerCase() ?? 'risk'} is the dominant driver (${risk.drivers[0]?.score ?? risk.score}/100).`,
      confidence: risk.confidence,
      uncertainty: uncertaintyForAction(action, incident, risk),
      verification: 'Record owner, time, location, and evidence link before marking complete.',
      lowResourceAdaptation: 'If offline, transmit incident ID, location, priority, casualty count, and requested resource by radio/SMS, then sync full evidence when connected.',
    };
  });
}

export function generateLowResourcePlan(incident: Incident, risk: ScientificRiskAssessment): LowResourcePlan {
  const constrained =
    risk.resourceStrain >= 55 ||
    incident.resourceConstraints?.connectivity === 'offline' ||
    incident.resourceConstraints?.power === 'critical';
  const degraded =
    constrained ||
    risk.resourceStrain >= 38 ||
    incident.resourceConstraints?.connectivity === 'intermittent' ||
    incident.resourceConstraints?.power === 'limited';

  return {
    mode: constrained ? 'offline-critical' : degraded ? 'degraded' : 'normal',
    triggers: unique([
      constrained ? 'Connectivity, power, or evacuation capacity is critically constrained.' : '',
      risk.detectabilityGap >= 55 ? 'Important facts are missing or unverified.' : '',
      risk.band === 'CRITICAL' ? 'Risk score requires immediate command validation.' : '',
      incident.resourceConstraints?.languageCoverage === 'multilingual' ? 'Reports may arrive in multiple languages.' : '',
      !incident.attachments?.length ? 'No photo or document evidence is attached yet.' : '',
    ]),
    minimumDataSet: [
      'Incident ID and last-updated time',
      'GPS/location text and nearest muster point',
      'Casualty count and immediate medical need',
      'Primary hazard, exposed team, and current control',
      'Command owner and next decision deadline',
      'Requested resource: medical, evacuation, isolation, fire, security, or logistics',
    ],
    communications: [
      'Use radio/SMS minimum-data message when data network is weak.',
      'Repeat command updates at fixed intervals until acknowledged.',
      'Keep one human-readable paper or whiteboard log at the command post.',
      'Confirm message receipt by name, role, and timestamp.',
    ],
    offlineCache: [
      'ERP steps for the active project',
      'Emergency contacts and command hierarchy',
      'Asset isolation sheets and critical certificates',
      'Muster list and last known team locations',
      'Recent incidents, observations, and Fire Aladdin lessons',
    ],
    syncPolicy: [
      'Queue field edits locally with device time and author.',
      'Prefer command-verified records when conflicts occur.',
      'Never delete offline evidence during reconciliation.',
      'Sync compact text first, then photos and documents.',
    ],
    languageSupport: [
      'Capture original reporter wording before translation.',
      'Use short controlled vocabulary for hazard, location, casualty, and resource need.',
      'Mark uncertain translations for Silver or Gold verification.',
    ],
    fieldKit: [
      'Laminated ERP quick cards',
      'Paper incident and casualty forms',
      'Battery bank and spare radio plan',
      'Offline map extract and muster roster',
    ],
  };
}

export function checkMissingDocumentation(incident: Incident): { complete: boolean, missingItems: string[] } {
  // Check for missing critical documentation or fields required before closing the incident.
  const missing: string[] = [];

  // Example: if a Diver Medic (DMT) was involved in response, ensure their certification proof is attached
  if (incident.description.toLowerCase().includes("dmt") || incident.description.toLowerCase().includes("medic")) {
    const hasDMTcert = incident.attachments.some(file =>
      file.toLowerCase().includes("dmt_cert") || file.toLowerCase().includes("medic_cert")
    );
    if (!hasDMTcert) {
      missing.push("DMT certification document (ensure the diver medic on duty had a valid certification)");
    }
  }

  // If the incident involved any injured person, check that a medical report or injury form is attached
  if ((incident.injuries && incident.injuries > 0) || (incident.fatalities && incident.fatalities > 0)) {
    const hasMedReport = incident.attachments.some(file =>
      file.toLowerCase().includes("medical_report") || file.toLowerCase().includes("injury_form")
    );
    if (!hasMedReport) {
      missing.push("Injury/medical report for the casualties");
    }
  }

  // If equipment failure, check for maintenance records or inspection reports attached
  if (incident.equipmentDamage) {
    const hasMaintRecord = incident.attachments.some(file =>
      file.toLowerCase().includes("maintenance") || file.toLowerCase().includes("inspection")
    );
    if (!hasMaintRecord) {
      missing.push("Equipment maintenance/inspection record");
    }
  }

  // Ensure investigation report (root cause analysis) is attached for significant incidents (Tier 1+)
  if (incident.severity !== undefined && incident.severity >= SeverityTier.TIER1) {
    const hasInvestigation = incident.attachments.some(file =>
      file.toLowerCase().includes("investigation_report") || file.toLowerCase().includes("root_cause")
    );
    if (!hasInvestigation) {
      missing.push("Incident investigation report");
    }
  }

  return { complete: missing.length === 0, missingItems: missing };
}

export interface ReportSections {
  coverPage: {
    title: string;
    project: string;
    date: string;
    incidentId: string;
    severityTier: string;
    escalationLevel: string;
  };
  incidentDetails: {
    description: string;
    timeline: string[];
  };
  initialResponse: string[];
  escalatedResponse: string[];
  investigation: string;
  correctiveActions: string[];
  signOffs: {
    preparedBy: string;
    hseManager: string;
    projectManager: string;
  };
}

export function generateReportStructure(incident: Incident, actions: string[]): ReportSections {
  // Generate a structured report object that can be used to create PDF or other formats
  const severityMap = {
    0: 'Minor',
    1: 'Tactical',
    2: 'Operational',
    3: 'Strategic'
  };

  const escalationMap = {
    0: 'N/A',
    1: 'Bronze (On-Scene)',
    2: 'Silver (Operational)',
    3: 'Gold (Strategic)'
  };

  const severity = incident.severity ?? 0;

  return {
    coverPage: {
      title: `Incident Report: ${incident.title}`,
      project: "HydroDive Offshore Operations", // Could be dynamic from incident data
      date: new Date().toLocaleDateString(),
      incidentId: incident.id,
      severityTier: `Tier ${severity} – ${severityMap[severity as keyof typeof severityMap]} Response`,
      escalationLevel: `${escalationMap[severity as keyof typeof escalationMap]} Controller`
    },
    incidentDetails: {
      description: incident.description,
      timeline: [`Incident occurred at ${incident.location || 'offshore location'}`]
    },
    initialResponse: [
      "Alarm raised immediately and site team initiated first response.",
      "On-Scene Coordinator (Bronze) took charge and assessed the situation.",
      ...(severity >= SeverityTier.TIER1 ? ["Bronze notified Silver Emergency Controller and onshore support was put on standby."] : []),
      "Casualties treated by DMT/Doctor on site, scene stabilized."
    ],
    escalatedResponse: severity >= SeverityTier.TIER2 ? [
      "Silver Emergency Controller assembled Emergency Response Team onshore.",
      ...(severity >= SeverityTier.TIER3 ? ["Gold Controller assumed overall command and full management response mobilized."] : []),
      "Incident logged continuously; all decisions recorded and verified.",
      "External communications managed through official channels (Legal/HR) to control information."
    ] : [],
    investigation: "An investigation was conducted to determine root causes. Key findings and contributing factors are documented in the attached investigation report. FMECA principles were applied to assess failure modes and effects, guiding the corrective actions.",
    correctiveActions: actions,
    signOffs: {
      preparedBy: "__________________    Date: ___________",
      hseManager: "__________________    Date: ___________",
      projectManager: "__________________    Date: ___________"
    }
  };
}

// Utility function to get AI recommendations for any incident input
export async function getAIRecommendations(incidentInput: IncidentInput): Promise<IncidentAnalysisResult> {
  // Convert input to full incident object
  const incident: Incident = {
    id: incidentInput.id || `INC-${Date.now()}`,
    title: incidentInput.title,
    description: incidentInput.description,
    category: incidentInput.category,
    attachments: incidentInput.attachments || [],
    severity: incidentInput.severity,
    fatalities: incidentInput.fatalities,
    injuries: incidentInput.injuries,
    environmentalImpact: incidentInput.environmentalImpact,
    equipmentDamage: incidentInput.equipmentDamage,
    highPotentialNearMiss: incidentInput.highPotentialNearMiss,
    location: incidentInput.location,
    date: incidentInput.date,
    involvedPersons: incidentInput.involvedPersons,
    resourceConstraints: incidentInput.resourceConstraints
  };

  // Apply AI logic
  const severity = classifySeverity(incident);
  const risk = calculateScientificRiskAssessment(incident);
  const actions = suggestCorrectiveActions(incident);
  const evidenceCards = generateEvidenceCards(incident, actions, risk);
  const lowResourcePlan = generateLowResourcePlan(incident, risk);
  const documentation = checkMissingDocumentation(incident);
  const reportStructure = generateReportStructure(incident, actions);

  return {
    severity,
    risk,
    actions,
    evidenceCards,
    lowResourcePlan,
    documentation,
    reportStructure,
    analysisVersion: INCIDENT_ANALYSIS_VERSION,
    generatedAt: new Date().toISOString()
  };
}

export const analyzeIncident = getAIRecommendations;
