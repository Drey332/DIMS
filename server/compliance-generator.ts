import { OpenAI } from 'openai';
import { storage } from './storage';
import { protocolExcerpts, emergencyContacts, commandStructure, complianceRequirements } from './compliance-protocols';
import { Project, User, AuditLog, Incident, FileUpload } from '../shared/schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ComplianceData {
  project: Project;
  user: User;
  auditLogs: AuditLog[];
  incidents: Incident[];
  files: FileUpload[];
  timeframe: {
    startDate: Date;
    endDate: Date;
  };
}

interface ComplianceReport {
  overallCompliance: number;
  sections: {
    assetVerification: ComplianceSection;
    incidentManagement: ComplianceSection;
    emergencyResponse: ComplianceSection;
    documentation: ComplianceSection;
    training: ComplianceSection;
  };
  findings: Finding[];
  recommendations: string[];
  evidenceChain: Evidence[];
  protocolReferences: ProtocolReference[];
  legalDefensePackage: LegalDefensePackage;
}

interface ComplianceSection {
  score: number;
  status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  requirements: string[];
  evidenceFound: string[];
  gaps: string[];
}

interface Finding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  protocolReference: string;
  evidence: string;
  recommendation: string;
}

interface Evidence {
  type: 'PHOTO' | 'DOCUMENT' | 'LOG_ENTRY' | 'COMMUNICATION';
  timestamp: Date;
  description: string;
  source: string;
  protocolCompliance: string;
  chainOfCustody: string;
}

interface ProtocolReference {
  standard: string;
  section: string;
  requirement: string;
  complianceStatus: 'MET' | 'PARTIAL' | 'NOT_MET';
  evidence: string;
}

interface LegalDefensePackage {
  executiveSummary: string;
  complianceTimeline: TimelineEvent[];
  evidenceInventory: Evidence[];
  protocolAdherence: ProtocolReference[];
  responseEffectiveness: string;
  mitigationMeasures: string[];
  lessonsLearned: string[];
}

interface TimelineEvent {
  timestamp: Date;
  event: string;
  actors: string[];
  protocolStep: string;
  evidence: string;
}

export class ComplianceGenerator {
  static async generateComplianceReport(data: ComplianceData): Promise<ComplianceReport> {
    const prompt = this.buildCompliancePrompt(data);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior compliance auditor for offshore safety operations, specializing in IMCA, IOGP, and HydroDive protocols. You provide legally defensible audit reports with precise protocol citations and evidence chains. Your reports are used for regulatory compliance, legal defense, and insurance purposes. Always cite specific protocol sections and maintain chain of custody for all evidence.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const reportData = JSON.parse(response.choices[0].message.content || '{}');
      
      // Log the compliance report generation
      await storage.createAuditLog({
        actionType: 'COMPLIANCE_REPORT_GENERATED',
        description: `AI compliance report generated for project ${data.project.name}`,
        userId: data.user.id,
        projectId: data.project.id,
        oldData: null,
        newData: { 
          reportSummary: {
            overallCompliance: reportData.overallCompliance,
            findingsCount: reportData.findings?.length || 0,
            timeframe: data.timeframe
          }
        },
        ipAddress: null,
        userAgent: 'HydroSafe-Compliance-AI',
        sessionId: null
      });

      return reportData as ComplianceReport;
    } catch (error) {
      console.error('Compliance report generation failed:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  private static buildCompliancePrompt(data: ComplianceData): string {
    return `
COMPLIANCE AUDIT REQUEST - PROJECT: ${data.project.name}

PROJECT DETAILS:
- Project: ${data.project.name} (${data.project.number})
- Client: ${data.project.client}
- Location: ${data.project.location}
- Project Manager: ${data.user.username} (${data.user.role} level)
- Audit Period: ${data.timeframe.startDate.toISOString()} to ${data.timeframe.endDate.toISOString()}

APPLICABLE PROTOCOLS AND STANDARDS:
${JSON.stringify(protocolExcerpts, null, 2)}

COMMAND STRUCTURE REQUIREMENTS:
${JSON.stringify(commandStructure, null, 2)}

COMPLIANCE REQUIREMENTS:
${JSON.stringify(complianceRequirements, null, 2)}

EMERGENCY CONTACTS VERIFICATION:
${JSON.stringify(emergencyContacts, null, 2)}

AUDIT TRAIL DATA:
${JSON.stringify(data.auditLogs, null, 2)}

INCIDENT RECORDS:
${JSON.stringify(data.incidents, null, 2)}

UPLOADED EVIDENCE FILES:
${JSON.stringify(data.files, null, 2)}

AUDIT SCOPE AND REQUIREMENTS:
Perform a comprehensive compliance audit covering:

1. ASSET VERIFICATION COMPLIANCE
   - Verify all required assets have been inspected per protocol schedules
   - Check photographic evidence with GPS coordinates and timestamps
   - Validate functional testing documentation
   - Cross-reference against IOGP Report 456 KPI requirements

2. INCIDENT MANAGEMENT COMPLIANCE
   - Review incident reporting timelines against IMCA M 140 requirements
   - Verify Bronze-Silver-Gold command structure activation
   - Check evidence preservation and witness documentation
   - Validate medical response and evacuation procedures

3. EMERGENCY RESPONSE READINESS
   - Assess medevac route availability and response times
   - Verify emergency contact accessibility and response capability
   - Check communication system functionality
   - Validate emergency equipment readiness

4. DOCUMENTATION AND EVIDENCE CHAIN
   - Verify all required documentation is complete and timestamped
   - Check chain of custody for all evidence
   - Validate digital signatures and approval workflows
   - Cross-reference log entries with protocol requirements

5. TRAINING AND COMPETENCY
   - Verify personnel certifications and training records
   - Check emergency drill participation and outcomes
   - Validate role-specific competency requirements

REQUIRED OUTPUT FORMAT (JSON):
{
  "overallCompliance": [0-100 percentage],
  "sections": {
    "assetVerification": {
      "score": [0-100],
      "status": "COMPLIANT|PARTIAL|NON_COMPLIANT",
      "requirements": ["List of protocol requirements"],
      "evidenceFound": ["List of evidence that supports compliance"],
      "gaps": ["List of missing or incomplete items"]
    },
    "incidentManagement": { /* same structure */ },
    "emergencyResponse": { /* same structure */ },
    "documentation": { /* same structure */ },
    "training": { /* same structure */ }
  },
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "category": "Asset Verification|Incident Management|etc",
      "description": "Detailed finding description",
      "protocolReference": "Exact protocol section citation",
      "evidence": "Supporting evidence or lack thereof",
      "recommendation": "Specific corrective action required"
    }
  ],
  "recommendations": ["Priority-ordered recommendations for full compliance"],
  "evidenceChain": [
    {
      "type": "PHOTO|DOCUMENT|LOG_ENTRY|COMMUNICATION",
      "timestamp": "ISO timestamp",
      "description": "Evidence description",
      "source": "Who created/submitted",
      "protocolCompliance": "Which protocol requirement this satisfies",
      "chainOfCustody": "Custody information"
    }
  ],
  "protocolReferences": [
    {
      "standard": "IMCA|IOGP|HydroDive|Shell SPDC",
      "section": "Exact section reference",
      "requirement": "Specific requirement text",
      "complianceStatus": "MET|PARTIAL|NOT_MET",
      "evidence": "Evidence supporting compliance status"
    }
  ],
  "legalDefensePackage": {
    "executiveSummary": "High-level summary suitable for legal review",
    "complianceTimeline": [
      {
        "timestamp": "ISO timestamp",
        "event": "What happened",
        "actors": ["Who was involved"],
        "protocolStep": "Which protocol step this represents",
        "evidence": "Supporting evidence"
      }
    ],
    "evidenceInventory": [/* All evidence with full metadata */],
    "protocolAdherence": [/* All protocol references with compliance status */],
    "responseEffectiveness": "Assessment of emergency response effectiveness",
    "mitigationMeasures": ["Actions taken to address issues"],
    "lessonsLearned": ["Key insights for future improvement"]
  }
}

AUDIT INSTRUCTIONS:
- Be thorough and cite specific protocol sections for every finding
- Flag any missing evidence, overdue inspections, or protocol violations
- Provide legally defensible evidence chains with timestamps
- Include specific recommendations with protocol references
- Assess compliance gaps that could create liability exposure
- Generate a comprehensive legal defense package suitable for regulatory review
`;
  }

  static async generateLegalDefensePackage(projectId: number, userId: number): Promise<LegalDefensePackage> {
    const project = await storage.getProject(projectId);
    const user = await storage.getUser(userId);
    const auditLogs = await storage.getAuditLogs({ projectId });
    const incidents = await storage.getIncidentsByProject(projectId);
    const files = await storage.getFileUploadsByProject(projectId);

    if (!project || !user) {
      throw new Error('Project or user not found');
    }

    const data: ComplianceData = {
      project,
      user,
      auditLogs,
      incidents,
      files,
      timeframe: {
        startDate: new Date(project.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to 30 days ago
        endDate: new Date()
      }
    };

    const fullReport = await this.generateComplianceReport(data);
    return fullReport.legalDefensePackage;
  }

  static async generateExecutiveSummary(projectId: number, userId: number): Promise<string> {
    const legalPackage = await this.generateLegalDefensePackage(projectId, userId);
    
    return `
EXECUTIVE COMPLIANCE SUMMARY
Project: ${(await storage.getProject(projectId))?.name}
Date: ${new Date().toISOString()}

${legalPackage.executiveSummary}

KEY COMPLIANCE METRICS:
- Protocol Adherence: ${legalPackage.protocolAdherence.filter(p => p.complianceStatus === 'MET').length}/${legalPackage.protocolAdherence.length} requirements met
- Evidence Items: ${legalPackage.evidenceInventory.length} documented pieces of evidence
- Timeline Events: ${legalPackage.complianceTimeline.length} key events tracked

RESPONSE EFFECTIVENESS:
${legalPackage.responseEffectiveness}

MITIGATION MEASURES IMPLEMENTED:
${legalPackage.mitigationMeasures.map(m => `• ${m}`).join('\n')}

This summary provides a high-level overview suitable for executive review and regulatory communication.
`;
  }
}