// Emergency Response Plan Knowledge Base
// Structured knowledge from HydroDive ERP documentation for AI-powered emergency response

export interface ERPSection {
  id: string;
  title: string;
  content: string;
  category: 'policy' | 'procedure' | 'contact' | 'scenario' | 'drill' | 'oversight';
  priority: 'critical' | 'high' | 'medium' | 'low';
  keywords: string[];
}

export const erpKnowledge: ERPSection[] = [
  {
    id: "objective",
    title: "Emergency Response Objective",
    content: `HydroDive's Emergency Response Plan ensures strict, logical procedures are followed in emergencies to prevent further harm, save lives, and limit damage to property/environment. Emergencies require additional resources—this plan covers all activities to be performed 24/7 in case of emergency.`,
    category: 'policy',
    priority: 'critical',
    keywords: ['objective', 'purpose', 'emergency', 'response', 'procedures', 'safety']
  },
  {
    id: "project-overview",
    title: "Forcados Project Overview",
    content: `Decommissioning of Forcados ACOE Temporary Export System (SPDC/CPTL/HydroDive). Subsea diving support for the removal of temporary export system, performed from Dive Support Vessels in compliance with HydroDive and IMCA guidelines.`,
    category: 'oversight',
    priority: 'high',
    keywords: ['forcados', 'decommissioning', 'subsea', 'diving', 'SPDC', 'IMCA', 'export system']
  },
  {
    id: "emergency-policy",
    title: "HydroDive Emergency Response Policy",
    content: `All personnel must be fully conversant with emergency actions. Simulated emergency drills (following HDG-HSE-FRM-022) are mandatory at project start and at least every 30 days. Personnel must demonstrate competency in emergency response procedures.`,
    category: 'policy',
    priority: 'critical',
    keywords: ['policy', 'training', 'drills', 'HDG-HSE-FRM-022', 'competency', 'personnel']
  },
  {
    id: "scope",
    title: "Emergency Response Scope",
    content: `This document covers emergency response on the HD Contender vessel. It provides emergency contacts, scenario response plans, and is a reference for all personnel. All emergency flow charts must be posted in project/dive control offices.`,
    category: 'oversight',
    priority: 'high',
    keywords: ['scope', 'HD Contender', 'vessel', 'flowcharts', 'dive control', 'reference']
  },
  {
    id: "decision-making",
    title: "Emergency Decision Making Models",
    content: `In emergencies, use Recognition-Primed Decision Making and follow established flowcharts. The Bronze-Silver-Gold command hierarchy is used for clarity and interoperability. Decisions must be rapid, informed, and documented.`,
    category: 'procedure',
    priority: 'critical',
    keywords: ['decision making', 'bronze silver gold', 'command hierarchy', 'flowcharts', 'recognition-primed']
  },
  {
    id: "responsibilities",
    title: "Emergency Response Responsibilities",
    content: `OSC Bronze (Offshore Manager): First responder, coordinates with EC Silver and COSC. EC Silver (Project Mgr/Marine Mgr): Coordinates overall response, decides on level, manages team, writes after-action report. GM Gold (Strategic Lead): Sets overall strategy, appoints Silver, handles media/major decisions. ECM/ECT/HSE/Medical/Legal: Full supporting roles with specific emergency functions.`,
    category: 'procedure',
    priority: 'critical',
    keywords: ['responsibilities', 'OSC Bronze', 'EC Silver', 'GM Gold', 'offshore manager', 'project manager', 'strategic lead']
  },
  {
    id: "emergency-comm",
    title: "Emergency Communication Protocols",
    content: `Follow precise communication protocols. Accident reporting must include: Time, Date, Place, Type, Names, Actions Taken, Best Communication Means. Use SPDC and HydroDive's reporting structures for investigation, medical arrangements, and close out. All communications must be logged and timestamped.`,
    category: 'procedure',
    priority: 'critical',
    keywords: ['communication', 'reporting', 'accident', 'SPDC', 'investigation', 'medical', 'logging']
  },
  {
    id: "medevac-casevac",
    title: "MEDEVAC & CASEVAC Procedures",
    content: `MEDEVAC: Move injured/ill to shore hospital. Most likely: stabilize on vessel, transfer via helicopter or fast boat. CASEVAC: Immediate action, highest urgency (used for mass casualties or overwhelming emergencies). Always have helicopter and boat ready; activate secondary means if helicopter is delayed/unavailable.`,
    category: 'procedure',
    priority: 'critical',
    keywords: ['MEDEVAC', 'CASEVAC', 'medical evacuation', 'helicopter', 'fast boat', 'casualties', 'hospital']
  },
  {
    id: "drill-plan",
    title: "Emergency Drill Requirements",
    content: `Required drills include: Abandon Ship, Fire/Evacuation, MEDEVAC, Unconscious Diver Recovery, Muster, Lock-Down, Stretcher/Helideck transfer. Most are monthly, or at project start. All drills must be documented and evaluated for effectiveness.`,
    category: 'drill',
    priority: 'high',
    keywords: ['drills', 'abandon ship', 'fire evacuation', 'diver recovery', 'muster', 'lockdown', 'helideck']
  },
  {
    id: "scenarios",
    title: "Emergency Scenarios Coverage",
    content: `Plan covers: Medical (illness, injury, fatality), Fire onboard, Collision, Grounding, Oil Spill, Man Overboard, Security (Crime, Piracy, Kidnap), Missing Personnel, High Winds/Swell, Diving Incidents, Food Poisoning. Each scenario has specific response protocols and escalation procedures.`,
    category: 'scenario',
    priority: 'critical',
    keywords: ['medical', 'fire', 'collision', 'grounding', 'oil spill', 'man overboard', 'security', 'piracy', 'diving incidents']
  },
  {
    id: "diving-emergencies",
    title: "Diving Emergency Procedures",
    content: `Comprehensive procedures for: Fire in Dive Control/Chamber, Loss of Comms, Loss of Air Supply, Contaminated Gas, Unconscious/Injured Diver Recovery (single/two divers), Fouled/Trapped Diver, Severed Umbilical, DP Degraded/Loss of Position, LARS Failure, Evacuation of Divers Under Decompression, Diver Adrift, and Emergency Reporting.`,
    category: 'scenario',
    priority: 'critical',
    keywords: ['diving emergency', 'dive control', 'chamber', 'communications', 'air supply', 'contaminated gas', 'diver recovery', 'umbilical', 'decompression']
  },
  {
    id: "fire-response",
    title: "Fire Emergency Response",
    content: `Immediate actions: Sound alarm, assess situation, attempt suppression if safe, evacuate if necessary. Coordinate with Marine Control, ensure crew safety, prepare for MEDEVAC if injuries occur. Document all actions and maintain communication with shore support.`,
    category: 'scenario',
    priority: 'critical',
    keywords: ['fire', 'alarm', 'suppression', 'evacuation', 'marine control', 'crew safety', 'shore support']
  },
  {
    id: "man-overboard",
    title: "Man Overboard Response",
    content: `Immediate actions: Sound alarm, mark position, deploy rescue craft, maintain visual contact, coordinate recovery. Ensure proper safety equipment deployment, medical assessment upon recovery, and full incident documentation.`,
    category: 'scenario',
    priority: 'critical',
    keywords: ['man overboard', 'rescue', 'position marking', 'recovery', 'safety equipment', 'medical assessment']
  },
  {
    id: "security-threats",
    title: "Security Threat Response",
    content: `Security incidents including piracy, kidnapping, or criminal activity require immediate escalation to Gold Command and shore authorities. Implement lockdown procedures, ensure personnel safety, coordinate with naval/coast guard forces as available.`,
    category: 'scenario',
    priority: 'critical',
    keywords: ['security', 'piracy', 'kidnapping', 'criminal', 'lockdown', 'naval', 'coast guard', 'authorities']
  }
];

export class ERPKnowledgeService {
  /**
   * Search ERP knowledge base by query string
   */
  static findRelevantSections(query: string, limit: number = 5): ERPSection[] {
    const queryLower = query.toLowerCase();
    
    // Score sections based on relevance
    const scoredSections = erpKnowledge.map(section => {
      let score = 0;
      
      // Title match (highest weight)
      if (section.title.toLowerCase().includes(queryLower)) score += 10;
      
      // Keywords match (high weight)
      const keywordMatches = section.keywords.filter(keyword => 
        keyword.toLowerCase().includes(queryLower) || queryLower.includes(keyword.toLowerCase())
      ).length;
      score += keywordMatches * 5;
      
      // Content match (medium weight)
      if (section.content.toLowerCase().includes(queryLower)) score += 3;
      
      // Priority boost
      switch (section.priority) {
        case 'critical': score += 2; break;
        case 'high': score += 1; break;
      }
      
      return { section, score };
    });
    
    // Return top scored sections
    return scoredSections
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.section);
  }
  
  /**
   * Get sections by category
   */
  static getSectionsByCategory(category: ERPSection['category']): ERPSection[] {
    return erpKnowledge.filter(section => section.category === category);
  }
  
  /**
   * Get critical priority sections
   */
  static getCriticalSections(): ERPSection[] {
    return erpKnowledge.filter(section => section.priority === 'critical');
  }
  
  /**
   * Get ERP context for AI prompts
   */
  static getContextForAI(scenario: string): string {
    const relevantSections = this.findRelevantSections(scenario, 3);
    
    if (relevantSections.length === 0) {
      return "No specific ERP guidance found for this scenario. Follow general emergency protocols.";
    }
    
    return relevantSections.map(section => 
      `**${section.title}**: ${section.content}`
    ).join('\n\n');
  }
  
  /**
   * Get emergency contacts context
   */
  static getEmergencyContactsGuidance(): string {
    const contactSection = erpKnowledge.find(s => s.id === 'emergency-comm');
    return contactSection ? contactSection.content : "Follow standard emergency communication protocols.";
  }
}