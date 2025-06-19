import OpenAI from "openai";

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
}

export async function generateDynamicChecklist(
  scenarioType: string,
  projectDetails: any,
  userRole: 'BRONZE' | 'SILVER' | 'GOLD'
): Promise<ChecklistItem[]> {
  try {
    const prompt = `As an AI safety expert for offshore operations, generate a dynamic emergency response checklist for HydroDive's emergency response protocol.

Context:
- Scenario: ${scenarioType}
- User Role: ${userRole} (Bronze=On-Scene, Silver=Tactical, Gold=Strategic)
- Project: ${JSON.stringify(projectDetails)}

Generate a role-appropriate checklist following HydroDive's Bronze-Silver-Gold hierarchy. Include:
- Priority level for each item
- Estimated time requirements
- Protocol references (IMCA, IOGP, company procedures)
- Risk mitigation steps
- Dependencies between tasks

Return JSON array of checklist items with this structure:
{
  "items": [
    {
      "id": "unique_id",
      "description": "Action description",
      "priority": "HIGH",
      "estimatedTime": "5 minutes",
      "protocolReference": "IMCA D 014",
      "dependencies": ["previous_action_id"],
      "riskMitigation": "Risk description and mitigation"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in offshore emergency response protocols, specifically trained on HydroDive's procedures, IMCA guidelines, and IOGP standards. Generate practical, actionable checklists."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"items": []}');
    return result.items || [];
  } catch (error) {
    console.error("Error generating checklist:", error);
    throw new Error("Failed to generate dynamic checklist: " + error.message);
  }
}

export async function getEmergencyProtocolGuidance(
  emergencyType: string,
  projectContext: any,
  currentConditions: any
): Promise<EmergencyGuidance> {
  try {
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

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as EmergencyGuidance;
  } catch (error) {
    console.error("Error getting protocol guidance:", error);
    throw new Error("Failed to get emergency protocol guidance: " + error.message);
  }
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
    throw new Error("Failed to analyze decision context: " + error.message);
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
    throw new Error("Failed to generate proactive recommendations: " + error.message);
  }
}
