import { OpenAI } from 'openai';
import { storage } from './storage';
import { AuditLog, Project, User } from '../shared/schema';
import { ERPKnowledgeService } from './erpKnowledge';
import { ERPScenariosService } from './erpScenarios';
import { ERPQnAService } from './erpQnA';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AuditContext {
  projectData: Project;
  user: User;
  recentActions: AuditLog[];
  protocolContext: string;
  actionDetails: {
    type: string;
    description: string;
    evidence?: string[];
    timestamp: Date;
    criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

interface AuditResponse {
  complianceStatus: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT' | 'CRITICAL_VIOLATION';
  findings: string[];
  requiredActions: string[];
  protocolReferences: string[];
  blockAction: boolean;
  nextSteps: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class AIAuditReferee {
  private static getProtocolExcerpts(actionType: string, projectType: string): string {
    // Get relevant ERP sections based on action type
    const erpContext = ERPKnowledgeService.getContextForAI(actionType);
    
    const protocols = {
      ASSET_VERIFICATION: `
        HydroDive ERP Guidance:
        ${erpContext}
        
        IMCA D 014 - Dynamic Positioning Vessel Design Philosophy Guidelines:
        - All critical safety systems must be verified before operations
        - Photo evidence required for all asset inspections
        - Verification intervals: Fire suppression (monthly), Life support (weekly)
        
        IOGP Report 456 - Process Safety - Recommended Practice on Key Performance Indicators:
        - Asset integrity KPIs must be tracked and documented
        - Non-compliance must trigger immediate corrective action
        - All verification activities require timestamp and GPS coordinates
      `,
      INCIDENT_REPORTING: `
        HydroDive ERP Emergency Response:
        ${ERPKnowledgeService.getContextForAI('emergency communication')}
        
        IMCA M 140 - Guidance on Incident Investigation:
        - Incident must be reported within 2 hours of occurrence
        - Initial assessment required within 30 minutes
        - Photo documentation mandatory for all incidents
        
        IOGP Report 510 - Operating Management System Framework:
        - Immediate response team activation required for HIGH/CRITICAL incidents
        - All stakeholders must be notified according to escalation matrix
      `,
      EMERGENCY_RESPONSE: `
        HydroDive ERP Command Structure:
        ${ERPKnowledgeService.getContextForAI('decision making responsibilities')}
        
        Emergency Communication Requirements:
        ${ERPKnowledgeService.getEmergencyContactsGuidance()}
        
        IMCA R 004 - Code of Practice for the Safe Use of Electricity Underwater:
        - Emergency procedures must follow Bronze-Silver-Gold command structure
        - All emergency actions require dual authorization for CRITICAL level
        - Communication protocols must be maintained at all times
      `,
      DIVING_EMERGENCY: `
        HydroDive ERP Diving Procedures:
        ${ERPKnowledgeService.getContextForAI('diving emergency')}
        
        Critical Response Requirements:
        - Immediate action within 2 minutes of incident detection
        - Surface support team activation mandatory
        - Emergency gas supply verification required
      `,
      TEAM_MANAGEMENT: `
        HydroDive ERP Command Hierarchy:
        ${ERPKnowledgeService.getContextForAI('responsibilities')}
        
        Gold Command Authorization Protocol:
        - Strategic decisions require Gold Command approval
        - Team structure changes must be documented
        - Emergency contact verification mandatory
      `
    };
    
    const selectedProtocol = protocols[actionType as keyof typeof protocols];
    
    if (selectedProtocol) {
      return selectedProtocol;
    }
    
    // Fallback to ERP knowledge search
    const fallbackContext = ERPKnowledgeService.getContextForAI(actionType);
    return fallbackContext || "Standard offshore safety protocols apply. Refer to IMCA, IOGP, and HydroDive ERP guidelines.";
  }

  static async auditAction(context: AuditContext): Promise<AuditResponse> {
    const { projectData, user, recentActions, actionDetails } = context;
    
    // Get comprehensive context from all knowledge sources
    const protocolExcerpts = this.getProtocolExcerpts(actionDetails.type, projectData.description || '');
    const relevantScenarios = ERPScenariosService.searchScenarios(actionDetails.type);
    const scenarioContext = relevantScenarios.slice(0, 2).map(scenario => 
      ERPScenariosService.getScenarioContextForAI(scenario.id)
    ).join('\n\n');
    const qnaContext = ERPQnAService.getQnAContextForAI(actionDetails.type);
    
    const auditPrompt = `
You are HydroSafe's AI Safety Referee - a strict compliance auditor for offshore operations with comprehensive knowledge of emergency response protocols.

PROJECT CONTEXT:
- Project: ${projectData.name} (${projectData.number})
- Client: ${projectData.client}
- Location: ${projectData.location}
- Current User: ${user.username} (${user.role} level)

APPLICABLE PROTOCOLS:
${protocolExcerpts}

RELEVANT EMERGENCY SCENARIOS:
${scenarioContext}

EMERGENCY RESPONSE Q&A GUIDANCE:
${qnaContext}

RECENT AUDIT HISTORY (Last 5 actions):
${recentActions.slice(0, 5).map(log => `
- ${log.createdAt}: ${log.actionType} by User ${log.userId}
- Description: ${log.description}
`).join('\n')}

CURRENT ACTION UNDER REVIEW:
- Type: ${actionDetails.type}
- Description: ${actionDetails.description}
- User Role: ${user.role}
- Criticality: ${actionDetails.criticality}
- Evidence Provided: ${actionDetails.evidence?.length || 0} files
- Timestamp: ${actionDetails.timestamp}

COMPREHENSIVE AUDIT ASSESSMENT:
1. Review against offshore safety protocols and emergency procedures
2. Check compliance with Bronze-Silver-Gold command hierarchy requirements
3. Verify appropriate role permissions and escalation procedures
4. Assess emergency response timing and protocol adherence
5. Flag any missing evidence, documentation, or approvals
6. Determine if action should proceed or be blocked for safety

Respond in JSON format with:
- complianceStatus: COMPLIANT/WARNING/NON_COMPLIANT/CRITICAL_VIOLATION
- findings: Array of specific compliance issues found
- requiredActions: What must be done to achieve compliance
- protocolReferences: Specific protocol sections cited
- blockAction: true if action must be stopped
- nextSteps: Recommended next actions for user
- riskLevel: Overall risk assessment

Be strict but constructive. Always cite specific protocol sections when flagging issues.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are HydroSafe's AI Safety Referee. You enforce strict compliance with offshore safety protocols (IMCA, IOGP, HydroDive standards). Never allow protocol violations. Always cite specific standards when flagging issues. Respond only in valid JSON format."
          },
          {
            role: "user",
            content: auditPrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const auditResult = JSON.parse(response.choices[0].message.content || '{}') as AuditResponse;
      
      // Log the audit result
      await storage.createAuditLog({
        actionType: 'AI_AUDIT_REVIEW',
        description: `AI Referee reviewed ${actionDetails.type}: ${auditResult.complianceStatus}`,
        userId: user.id,
        projectId: projectData.id,
        oldData: context,
        newData: auditResult,
        ipAddress: null,
        userAgent: 'HydroSafe-AI-Referee',
        sessionId: null
      });

      return auditResult;
    } catch (error) {
      console.error('AI Audit failed:', error);
      return {
        complianceStatus: 'WARNING',
        findings: ['AI audit system temporarily unavailable'],
        requiredActions: ['Manual compliance review required'],
        protocolReferences: [],
        blockAction: false,
        nextSteps: ['Proceed with manual safety checklist'],
        riskLevel: 'MEDIUM'
      };
    }
  }

  static async getComplianceSummary(projectId: number, userId: number): Promise<{
    overallCompliance: number;
    criticalIssues: number;
    pendingActions: string[];
    protocolViolations: string[];
  }> {
    const recentLogs = await storage.getAuditLogs({ projectId, userId });
    const aiAuditLogs = recentLogs.filter(log => log.actionType === 'AI_AUDIT_REVIEW');
    
    if (aiAuditLogs.length === 0) {
      return {
        overallCompliance: 100,
        criticalIssues: 0,
        pendingActions: [],
        protocolViolations: []
      };
    }

    const complianceScores = aiAuditLogs.map(log => {
      const result = log.newData as AuditResponse;
      switch (result.complianceStatus) {
        case 'COMPLIANT': return 100;
        case 'WARNING': return 75;
        case 'NON_COMPLIANT': return 50;
        case 'CRITICAL_VIOLATION': return 0;
        default: return 75;
      }
    });

    const overallCompliance = Math.round(
      complianceScores.reduce((sum: number, score: number) => sum + score, 0) / complianceScores.length
    );

    const criticalIssues = aiAuditLogs.filter(log => {
      const result = log.newData as AuditResponse;
      return result.complianceStatus === 'CRITICAL_VIOLATION' || result.riskLevel === 'CRITICAL';
    }).length;

    const pendingActions = aiAuditLogs
      .flatMap(log => (log.newData as AuditResponse).requiredActions)
      .filter(Boolean);

    const protocolViolations = aiAuditLogs
      .flatMap(log => (log.newData as AuditResponse).findings)
      .filter(finding => finding.includes('violation') || finding.includes('non-compliant'));

    return {
      overallCompliance,
      criticalIssues,
      pendingActions: Array.from(new Set(pendingActions)),
      protocolViolations: Array.from(new Set(protocolViolations))
    };
  }
}