import OpenAI from "openai";
import { ERPKnowledgeService } from './erpKnowledge';
import { ERPScenariosService } from './erpScenarios';
import { ERPQnAService } from './erpQnA';
import { evaluateFireRisk, type FireOperationPhase, type Telemetry } from "./fire-intel/rules";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ChecklistItem {
  id: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedTime: string;
  protocolReference?: string;
  dependencies?: string[];
  riskMitigation?: string;
}

export interface EmergencyGuidance {
  protocol: string;
  timeStandards: string[];
  requiredActions: ChecklistItem[];
  escalationCriteria: string[];
  protocolReferences: string[];
  riskAssessment: string;
  fireRisk?: {
    level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    score: number;
    findings: string[];
  };
}

// Comprehensive emergency protocol database based on IMCA, IOGP, and HydroDive standards
const EMERGENCY_PROTOCOLS = {
  MEDICAL_EMERGENCY: {
    protocol: "IMCA D 014 Medical Emergency Response Protocol",
    timeStandards: [
      "Initial response: <2 minutes",
      "First aid stabilization: <5 minutes", 
      "MEDEVAC decision: <10 minutes",
      "Helicopter dispatch: <25 minutes",
      "Hospital evacuation: <40 minutes"
    ],
    requiredActions: [
      {
        id: "med_001",
        description: "Assess casualty condition and establish ABC (Airway, Breathing, Circulation)",
        priority: "CRITICAL" as const,
        estimatedTime: "2 minutes",
        protocolReference: "IMCA D 014 Section 3.1"
      },
      {
        id: "med_002", 
        description: "Contact MEDEVAC control and provide casualty details",
        priority: "CRITICAL" as const,
        estimatedTime: "3 minutes",
        protocolReference: "IMCA D 014 Section 4.2"
      },
      {
        id: "med_003",
        description: "Prepare helideck and secure evacuation route",
        priority: "HIGH" as const,
        estimatedTime: "15 minutes",
        protocolReference: "CAP 437 Offshore Helicopter Landing Areas"
      }
    ],
    escalationCriteria: [
      "Life-threatening injury requiring immediate evacuation",
      "Unconscious casualty with unknown cause",
      "Multiple casualties from single incident"
    ],
    protocolReferences: ["IMCA D 014", "IOGP 390", "CAP 437"],
    riskAssessment: "Weather conditions and sea state may affect helicopter operations. Backup marine evacuation required if aviation not possible."
  },
  SAFETY_INCIDENT: {
    protocol: "HydroDive Incident Reporting Protocol HSE-001",
    timeStandards: [
      "Immediate area securing: <5 minutes",
      "Initial notification: <15 minutes",
      "Detailed report: <2 hours",
      "Investigation start: <24 hours"
    ],
    requiredActions: [
      {
        id: "saf_001",
        description: "Secure incident area and prevent further exposure",
        priority: "CRITICAL" as const,
        estimatedTime: "5 minutes",
        protocolReference: "HydroDive HSE-001"
      },
      {
        id: "saf_002",
        description: "Notify operations control and safety officer",
        priority: "HIGH" as const, 
        estimatedTime: "10 minutes",
        protocolReference: "HydroDive HSE-001"
      }
    ],
    escalationCriteria: [
      "Multiple personnel affected",
      "Environmental impact potential",
      "Equipment failure causing operational shutdown"
    ],
    protocolReferences: ["HydroDive HSE-001", "IOGP 456"],
    riskAssessment: "Incident may affect ongoing operations and require immediate containment measures."
  }
};

const ROLE_BASED_CHECKLISTS = {
  BRONZE: [
    {
      id: "bronze_001",
      description: "Conduct immediate scene assessment and casualty triage",
      priority: "CRITICAL" as const,
      estimatedTime: "3 minutes",
      protocolReference: "IMCA D 014 Section 2.1",
      riskMitigation: "Maintain situational awareness and personal safety"
    },
    {
      id: "bronze_002", 
      description: "Provide first aid and life support as trained",
      priority: "CRITICAL" as const,
      estimatedTime: "Ongoing",
      protocolReference: "IMCA D 014 Section 3.0"
    },
    {
      id: "bronze_003",
      description: "Communicate casualty status to Silver command",
      priority: "HIGH" as const,
      estimatedTime: "2 minutes",
      protocolReference: "HydroDive Command Structure"
    }
  ],
  SILVER: [
    {
      id: "silver_001",
      description: "Coordinate tactical response and resource allocation",
      priority: "HIGH" as const,
      estimatedTime: "5 minutes", 
      protocolReference: "IMCA D 014 Section 5.0"
    },
    {
      id: "silver_002",
      description: "Liaise with external emergency services",
      priority: "HIGH" as const,
      estimatedTime: "10 minutes",
      protocolReference: "IMCA D 014 Section 6.0"
    }
  ],
  GOLD: [
    {
      id: "gold_001",
      description: "Make strategic decisions on evacuation and operations",
      priority: "HIGH" as const, 
      estimatedTime: "15 minutes",
      protocolReference: "IMCA D 014 Section 7.0"
    }
  ]
};

function resolveFirePhase(projectContext: any, emergencyType: string): FireOperationPhase {
  const candidate = (projectContext?.phase || emergencyType || "").toString().toLowerCase();
  if (["production", "drilling", "completion", "maintenance"].includes(candidate)) {
    return candidate as FireOperationPhase;
  }
  if (candidate.includes("drill")) {
    return "drilling";
  }
  if (candidate.includes("completion") || candidate.includes("well kill")) {
    return "completion";
  }
  if (candidate.includes("maint")) {
    return "maintenance";
  }
  return "production";
}

function normalizeTelemetry(input: any): Telemetry {
  if (!input || typeof input !== "object") {
    return {};
  }

  const telemetry: Telemetry = {};
  const source = input.telemetry && typeof input.telemetry === "object" ? input.telemetry : input;

  const gasValue = source.gasPpm ?? source.gasReading ?? source.gas_ppm;
  if (typeof gasValue === "number") {
    telemetry.gasPpm = gasValue;
  }

  if (typeof source.delugeReady === "boolean") {
    telemetry.delugeReady = source.delugeReady;
  } else if (typeof source.delugeStatus === "string") {
    telemetry.delugeReady = source.delugeStatus.toLowerCase() === "ready" || source.delugeStatus.toLowerCase() === "available";
  }

  if (typeof source.eStopHealthy === "boolean") {
    telemetry.eStopHealthy = source.eStopHealthy;
  } else if (typeof source.eStopStatus === "string") {
    telemetry.eStopHealthy = source.eStopStatus.toLowerCase() === "healthy" || source.eStopStatus.toLowerCase() === "ok";
  }

  if (typeof source.bopMode === "string") {
    const mode = source.bopMode.toLowerCase();
    telemetry.bopMode = mode === "closed" || mode === "open" ? (mode as "closed" | "open") : "unknown";
  }

  if (typeof source.negPressureTest === "string") {
    const normalized = source.negPressureTest.toLowerCase();
    if (["pass", "fail", "ambiguous", "not_applicable"].includes(normalized)) {
      telemetry.negPressureTest = normalized as Telemetry["negPressureTest"];
    }
  }

  if (typeof source.flareStatus === "string") {
    const status = source.flareStatus.toLowerCase();
    telemetry.flareStatus = status === "down" ? "down" : "available";
  }

  if (typeof source.simultaneousOps === "boolean") {
    telemetry.simultaneousOps = source.simultaneousOps;
  }

  if (typeof source.hotWorkActive === "boolean") {
    telemetry.hotWorkActive = source.hotWorkActive;
  }

  if (typeof source.permitIsolationVerified === "boolean") {
    telemetry.permitIsolationVerified = source.permitIsolationVerified;
  }

  return telemetry;
}

export async function generateDynamicChecklist(
  scenarioType: string,
  projectDetails: any,
  userRole: 'BRONZE' | 'SILVER' | 'GOLD'
): Promise<ChecklistItem[]> {
  try {
    // Get comprehensive context from all knowledge sources
    const scenarioContext = ERPScenariosService.getScenarioContextForAI(scenarioType);
    const qnaContext = ERPQnAService.getQnAContextForAI(scenarioType);
    const knowledgeContext = ERPKnowledgeService.getContextForAI(scenarioType);
    
    // First try OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      const prompt = `Generate emergency response checklist for HydroDive offshore operations using comprehensive ERP knowledge.

SCENARIO CONTEXT: ${scenarioType}
USER ROLE: ${userRole} (Bronze=Operational, Silver=Tactical, Gold=Strategic)
PROJECT: ${JSON.stringify(projectDetails)}

RELEVANT ERP SCENARIOS:
${scenarioContext}

EMERGENCY RESPONSE Q&A GUIDANCE:
${qnaContext}

ADDITIONAL PROTOCOL CONTEXT:
${knowledgeContext}

Generate role-specific checklist following Bronze-Silver-Gold command hierarchy and HydroDive ERP procedures. Focus on actions appropriate for the user's command level with proper escalation protocols.

Return JSON: {"items": [{"id": "string", "description": "string", "priority": "CRITICAL|HIGH|MEDIUM|LOW", "estimatedTime": "string", "protocolReference": "string", "riskMitigation": "string", "dependencies": ["string"], "commandLevel": "BRONZE|SILVER|GOLD"}]}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system", 
            content: "Expert in HydroDive emergency response protocols with comprehensive knowledge of offshore safety procedures, Bronze-Silver-Gold command structure, IMCA guidelines, IOGP standards, and detailed emergency scenarios."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"items": []}');
      return result.items || [];
    }
  } catch (error) {
    console.log("OpenAI unavailable, using internal protocols:", String(error));
  }

  // Fallback to internal protocol database with enhanced context
  const baseActions = ROLE_BASED_CHECKLISTS[userRole] || [];
  const scenarioActions = scenarioType === "EMERGENCY_RESPONSE" ? 
    EMERGENCY_PROTOCOLS.MEDICAL_EMERGENCY.requiredActions.slice(0, 3) : [];
  
  return [...baseActions, ...scenarioActions] as ChecklistItem[];
}

export async function getEmergencyProtocolGuidance(
  emergencyType: string,
  projectContext: any,
  currentConditions: any
): Promise<EmergencyGuidance> {
  const firePhase = resolveFirePhase(projectContext, emergencyType);
  const telemetry = normalizeTelemetry(currentConditions);
  const fireRisk = evaluateFireRisk(firePhase, telemetry);

  try {
    // First try OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      const prompt = `Provide emergency protocol guidance for HydroDive offshore operations.

Emergency Type: ${emergencyType}
Project Context: ${JSON.stringify(projectContext)}
Current Conditions: ${JSON.stringify(currentConditions)}

Based on HydroDive's Emergency Response Manual and industry standards (IMCA, IOGP, DMAC), provide:
1. Applicable protocol name and reference
2. Time standards for response (e.g., 10-min heli response, 40-min psychiatric evacuation)
3. Required actions with specific time limits
4. Escalation criteria and thresholds
5. Relevant protocol section references
6. Risk assessment and mitigation strategies

Return JSON format:
{
  "protocol": "Protocol name",
  "timeStandards": ["Standard 1", "Standard 2"],
  "requiredActions": [
    {
      "id": "action_id",
      "description": "Action description",
      "priority": "CRITICAL",
      "estimatedTime": "10 minutes",
      "protocolReference": "IMCA reference"
    }
  ],
  "escalationCriteria": ["Criteria 1", "Criteria 2"],
  "protocolReferences": ["IMCA D 014 Section 3.2", "IOGP 456"],
  "riskAssessment": "Detailed risk analysis"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an emergency response specialist with deep knowledge of offshore operations, HydroDive procedures, IMCA guidelines, IOGP standards, and maritime emergency protocols."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}') as EmergencyGuidance;
      return { ...result, fireRisk };
    }
  } catch (error) {
    console.log("OpenAI unavailable, using internal protocols:", String(error));
  }

  // Fallback to internal protocol database
  const protocolKey = emergencyType.toUpperCase() as keyof typeof EMERGENCY_PROTOCOLS;
  const protocol = EMERGENCY_PROTOCOLS[protocolKey] || EMERGENCY_PROTOCOLS.MEDICAL_EMERGENCY;

  // Clean risk assessment without verbose JSON
  return {
    ...protocol,
    riskAssessment: `${protocol.riskAssessment} Project: ${projectContext?.projectName || 'Offshore operations'}.`,
    fireRisk,
  };
}

export async function analyzeDecisionContext(
  decisionData: any,
  userRole: string,
  projectContext: any
): Promise<{
  recommendations: string[];
  riskFactors: string[];
  protocolCompliance: string;
  nextSteps: string[];
}> {
  try {
    const prompt = `Analyze the decision-making context for HydroDive's I-A-P-O-A-R framework.

Decision Data: ${JSON.stringify(decisionData)}
User Role: ${userRole}
Project Context: ${JSON.stringify(projectContext)}

Using HydroDive's Information-Assessment-Powers-Options-Action-Review model, provide:
1. Specific recommendations for the current decision point
2. Key risk factors to consider
3. Protocol compliance assessment
4. Recommended next steps

Consider the user's authority level and decision-making scope within the Bronze-Silver-Gold hierarchy.

Return JSON format:
{
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "riskFactors": ["Risk 1", "Risk 2"],
  "protocolCompliance": "Compliance assessment",
  "nextSteps": ["Step 1", "Step 2"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a decision support specialist trained in HydroDive's I-A-P-O-A-R decision-making framework and emergency response protocols."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  } catch (error) {
    console.error("Error analyzing decision context:", error);
    throw new Error("Failed to analyze decision context: " + String(error));
  }
}

export async function generateProactiveRecommendations(
  projectData: any,
  weatherData: any,
  assetStatus: any,
  recentIncidents: any[]
): Promise<{
  recommendations: Array<{
    type: 'SAFETY' | 'OPERATIONAL' | 'COMPLIANCE' | 'WEATHER';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    actionRequired: string;
    timeframe: string;
    riskLevel: string;
  }>;
}> {
  try {
    const prompt = `Generate proactive safety recommendations for HydroDive offshore operations.

Project Data: ${JSON.stringify(projectData)}
Weather Data: ${JSON.stringify(weatherData)}
Asset Status: ${JSON.stringify(assetStatus)}
Recent Incidents: ${JSON.stringify(recentIncidents)}

Based on current conditions and trends, identify potential risks and provide proactive recommendations including:
1. Safety recommendations based on current conditions
2. Operational considerations for upcoming weather changes
3. Compliance requirements approaching deadlines
4. Equipment maintenance or inspection needs

Return JSON format:
{
  "recommendations": [
    {
      "type": "SAFETY",
      "priority": "HIGH",
      "description": "Description of the recommendation",
      "actionRequired": "Specific action needed",
      "timeframe": "When action should be taken",
      "riskLevel": "Associated risk level"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a proactive safety advisor with expertise in offshore operations, risk management, and predictive safety analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"recommendations": []}');
    return result;
  } catch (error) {
    console.error("Error generating proactive recommendations:", error);
    throw new Error("Failed to generate proactive recommendations: " + String(error));
  }
}
