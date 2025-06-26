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
}

// Input type for external usage
export type IncidentInput = Pick<Incident, 'title' | 'description' | 'category'> & Partial<Incident>;

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
export async function getAIRecommendations(incidentInput: IncidentInput): Promise<{
  severity: { tier: number; escalation: string };
  actions: string[];
  documentation: { complete: boolean; missingItems: string[] };
  reportStructure: ReportSections;
}> {
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
    involvedPersons: incidentInput.involvedPersons
  };

  // Apply AI logic
  const severity = classifySeverity(incident);
  const actions = suggestCorrectiveActions(incident);
  const documentation = checkMissingDocumentation(incident);
  const reportStructure = generateReportStructure(incident, actions);

  return {
    severity,
    actions,
    documentation,
    reportStructure
  };
}