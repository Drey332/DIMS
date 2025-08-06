import OpenAI from "openai";
import { db } from "@/firebase";
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// AI Analytics Result Schema - comprehensive safety analytics for oil & gas operations
export interface AIAnalyticsResult {
  executiveSummary: string;
  risks: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    likelihood: number; // 0-100%
    impact: string;
    recommendation: string;
  }>;
  recommendations: Array<{
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: string;
    title: string;
    description: string;
    implementation: string;
    estimatedCost: string;
    estimatedSavings: string;
    timeline: string;
  }>;
  opportunities: Array<{
    type: string;
    title: string;
    description: string;
    potentialSavings: string;
    implementationEffort: string;
    timeframe: string;
  }>;
  patterns: Array<{
    pattern: string;
    occurrences: number;
    significance: string;
    actionRequired: string;
  }>;
  trends: Array<{
    trend: string;
    direction: 'INCREASING' | 'DECREASING' | 'STABLE';
    timeframe: string;
    implication: string;
  }>;
  compliance: {
    overallStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    standards: Array<{
      standard: string;
      status: 'COMPLIANT' | 'MINOR_ISSUES' | 'MAJOR_ISSUES' | 'NON_COMPLIANT';
      notes: string;
    }>;
    recommendations: string[];
  };
  headcountAnalysis: {
    averageResponseTime: string;
    responseRate: string;
    locationCoverage: string;
    emergencyReadiness: string;
    recommendations: string[];
  };
  roiMetrics: {
    safetyInvestment: string;
    incidentCostSavings: string;
    operationalEfficiency: string;
    recommendations: string[];
  };
  timestamp: string;
  projectId: string;
  dataSnapshot: {
    emergenciesCount: number;
    observationsCount: number;
    nearMissesCount: number;
    headcountEvents: number;
    analysisDateRange: string;
  };
}

/**
 * Comprehensive AI Analytics Service for HydroSafe Projects
 * Analyzes all project safety data to generate actionable insights
 */
export class AIAnalyticsService {
  
  /**
   * Fetches all project data from Firestore
   */
  private async fetchProjectData(projectId: string) {
    try {
      // Fetch emergencies
      const emergenciesRef = collection(db, "emergencies");
      const emergenciesQuery = query(emergenciesRef, where("projectId", "==", projectId));
      const emergenciesSnapshot = await getDocs(emergenciesQuery);
      const emergencies = emergenciesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch observations (including near misses)
      const observationsRef = collection(db, "observations");
      const observationsQuery = query(observationsRef, where("projectId", "==", projectId));
      const observationsSnapshot = await getDocs(observationsQuery);
      const observations = observationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Separate near misses from general observations
      const nearMisses = observations.filter((obs: any) => 
        (Array.isArray(obs.type) && obs.type.includes("Near-miss")) || obs.status === "NEAR_MISS"
      );
      const generalObservations = observations.filter((obs: any) => 
        !(Array.isArray(obs.type) && obs.type.includes("Near-miss")) && obs.status !== "NEAR_MISS"
      );

      // Fetch all emergency acknowledgments for headcount analysis
      const headcountData: any[] = [];
      for (const emergency of emergencies) {
        const acksRef = collection(db, "emergencies", (emergency as any).id, "acks");
        const acksSnapshot = await getDocs(acksRef);
        const acks = acksSnapshot.docs.map(doc => ({ 
          emergencyId: (emergency as any).id, 
          emergencyType: (emergency as any).type,
          emergencyTime: (emergency as any).startTime,
          ...doc.data() 
        }));
        headcountData.push(...acks);
      }

      return {
        emergencies,
        observations: generalObservations,
        nearMisses,
        headcountData,
        projectId
      };
    } catch (error) {
      console.error("Error fetching project data:", error);
      throw new Error("Failed to fetch project data for analysis");
    }
  }

  /**
   * Generates comprehensive AI analysis of project safety data
   */
  async generateAnalytics(projectId: string): Promise<AIAnalyticsResult> {
    try {
      // Fetch all project data
      const projectData = await this.fetchProjectData(projectId);

      // Create comprehensive prompt for AI analysis
      const analysisPrompt = this.createAnalysisPrompt(projectData);

      // Get AI analysis
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a superintelligent offshore oil & gas operations safety analyst with expertise in IMCA, IOGP, HSE, and maritime safety standards. 

Your task is to analyze the provided project safety data and return a comprehensive JSON analysis that follows the exact AIAnalyticsResult schema. 

Focus on:
- Identifying real safety risks and patterns
- Providing actionable recommendations based on industry standards
- Calculating meaningful ROI and efficiency metrics
- Ensuring compliance with offshore safety regulations
- Analyzing emergency response effectiveness

Be precise, professional, and data-driven. All recommendations must be implementable and cost-effective.

Respond ONLY with valid JSON matching the AIAnalyticsResult interface - no additional text or formatting.`
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4000
      });

      // Parse the AI response
      const analysisResult = JSON.parse(response.choices[0].message.content || "{}");

      // Add metadata and validation
      const completeResult: AIAnalyticsResult = {
        ...analysisResult,
        timestamp: new Date().toISOString(),
        projectId,
        dataSnapshot: {
          emergenciesCount: projectData.emergencies.length,
          observationsCount: projectData.observations.length,
          nearMissesCount: projectData.nearMisses.length,
          headcountEvents: projectData.headcountData.length,
          analysisDateRange: this.getDateRange(projectData)
        }
      };

      // Save to Firestore
      await this.saveAnalytics(projectId, completeResult);

      return completeResult;

    } catch (error) {
      console.error("Error generating AI analytics:", error);
      throw new Error("Failed to generate AI analytics: " + (error as Error).message);
    }
  }

  /**
   * Creates a comprehensive analysis prompt for the AI
   */
  private createAnalysisPrompt(data: any): string {
    const { emergencies, observations, nearMisses, headcountData, projectId } = data;

    return `Analyze this offshore oil & gas project safety data for Project ID: ${projectId}

EMERGENCY INCIDENTS (${emergencies.length} total):
${emergencies.map((e: any, i: number) => `
${i + 1}. Type: ${e.type || 'Unknown'} | Priority: ${e.priority || 'Unknown'} | Status: ${e.status || 'Unknown'}
   Description: ${e.description || 'No description'}
   Date: ${e.startTime || e.createdAt || 'Unknown'}
   Notified Contacts: ${e.notifiedContacts?.length || 0} team members
   Location: ${e.location || 'Not specified'}
`).join('')}

SAFETY OBSERVATIONS (${observations.length} total):
${observations.slice(0, 20).map((o: any, i: number) => `
${i + 1}. Type: ${Array.isArray(o.type) ? o.type.join(', ') : o.type || 'General'}
   Observation: ${o.observation || 'No details'}
   Location: ${o.location || 'Not specified'}
   Stop Work: ${o.stopWork ? 'YES' : 'NO'}
   Date: ${o.date || o.createdAt || 'Unknown'}
   Recommendation: ${o.recommendation || 'None provided'}
`).join('')}

NEAR MISS INCIDENTS (${nearMisses.length} total):
${nearMisses.map((nm: any, i: number) => `
${i + 1}. Description: ${nm.observation || 'No description'}
   Location: ${nm.location || 'Not specified'}
   Reporter: ${nm.reporter || nm.submitterName || 'Anonymous'}
   Date: ${nm.date || nm.createdAt || 'Unknown'}
   Recommendation: ${nm.recommendation || 'None provided'}
`).join('')}

EMERGENCY RESPONSE DATA (${headcountData.length} acknowledgments):
${headcountData.slice(0, 10).map((hc: any, i: number) => `
${i + 1}. Emergency: ${hc.emergencyType || 'Unknown'} at ${hc.emergencyTime || 'Unknown time'}
   Responder: ${hc.name || 'Unknown'} | Response Time: ${hc.acknowledgedAt || 'Unknown'}
   Location Available: ${hc.hasLocation ? 'YES' : 'NO'} | GPS: ${hc.lat && hc.lng ? `${hc.lat}, ${hc.lng}` : 'No location'}
`).join('')}

PROJECT SUMMARY:
- Total Emergencies: ${emergencies.length}
- Total Observations: ${observations.length}
- Total Near Misses: ${nearMisses.length}
- Emergency Response Events: ${headcountData.length}

Provide a comprehensive analysis following the AIAnalyticsResult schema with:
1. Executive summary of overall safety performance
2. Identified risks with severity levels and mitigation strategies
3. Actionable recommendations prioritized by impact
4. Cost-saving opportunities and efficiency improvements
5. Pattern analysis of incidents and near misses
6. Safety trends over time
7. Compliance assessment against offshore safety standards
8. Emergency response effectiveness analysis
9. ROI calculations for safety investments
10. Headcount/muster system performance evaluation

Focus on real, actionable insights that can improve offshore safety operations.`;
  }

  /**
   * Saves analytics results to Firestore
   */
  private async saveAnalytics(projectId: string, result: AIAnalyticsResult): Promise<void> {
    try {
      const analyticsRef = doc(db, "projects", projectId, "aiAnalytics", "latest");
      await setDoc(analyticsRef, result);
      
      // Also save a timestamped version for history
      const timestampedRef = doc(db, "projects", projectId, "aiAnalytics", result.timestamp);
      await setDoc(timestampedRef, result);
      
    } catch (error) {
      console.error("Error saving analytics to Firestore:", error);
      throw new Error("Failed to save analytics results");
    }
  }

  /**
   * Gets the date range of the analyzed data
   */
  private getDateRange(data: any): string {
    const allDates = [
      ...data.emergencies.map((e: any) => e.startTime || e.createdAt),
      ...data.observations.map((o: any) => o.date || o.createdAt),
      ...data.nearMisses.map((nm: any) => nm.date || nm.createdAt),
      ...data.headcountData.map((hc: any) => hc.acknowledgedAt)
    ].filter(Boolean).map(date => new Date(date).getTime()).sort();

    if (allDates.length === 0) return "No data available";

    const earliest = new Date(allDates[0]).toLocaleDateString();
    const latest = new Date(allDates[allDates.length - 1]).toLocaleDateString();
    
    return `${earliest} - ${latest}`;
  }
}

// Export singleton instance
export const aiAnalyticsService = new AIAnalyticsService();