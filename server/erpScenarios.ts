// Emergency Response Plan Scenarios
// Detailed incident-specific protocols for HydroDive operations

export interface ERPScenario {
  id: string;
  title: string;
  content: string;
  category: 'medical' | 'fire' | 'marine' | 'environmental' | 'security' | 'diving' | 'weather' | 'operational';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeToRespond: string;
  requiredPersonnel: string[];
  keywords: string[];
}

export const erpScenarios: ERPScenario[] = [
  {
    id: "medical-incident",
    title: "Medical Incident (Illness/Injury/Fatality)",
    content: `
IMMEDIATE ACTIONS:
- Assess the situation: Ensure your own safety first
- Call for immediate medical assistance (Offshore Medic, HSE, Supervisor)
- Apply first aid per training and ERP protocol
- Notify Gold/Silver Command immediately

RESPONSE PROCEDURES:
- Record: Nature of incident, personnel involved, time, and actions taken
- Prepare for possible MEDEVAC; gather casualty's details and medical history
- Secure the area and preserve evidence if required
- Coordinate with helicopter or fast boat for evacuation

FOLLOW-UP:
- Log the incident fully and ensure after-action review
- Complete incident investigation report
- Medical insurance and next-of-kin notifications
- Review safety protocols and training requirements`,
    category: 'medical',
    severity: 'critical',
    timeToRespond: '< 2 minutes',
    requiredPersonnel: ['Offshore Medic', 'HSE Officer', 'Bronze Command', 'Silver Command'],
    keywords: ['medical', 'injury', 'illness', 'fatality', 'MEDEVAC', 'first aid', 'casualty']
  },
  {
    id: "fire-onboard",
    title: "Fire Onboard",
    content: `
IMMEDIATE ACTIONS:
- Raise the alarm and alert all crew
- Evacuate personnel from affected area to muster point
- Shut down affected systems (fuel/electrical/isolation as needed)
- Only trained personnel attempt firefighting using correct extinguishers

RESPONSE PROCEDURES:
- Notify Gold/Silver Command immediately
- Conduct headcount; prepare for possible Abandon Ship
- Ensure all firefighting and life-saving appliances are deployed per ERP
- Coordinate with Marine Control for external assistance if required

FOLLOW-UP:
- Follow up with full investigation and log the event
- Assess structural damage and equipment status
- Review fire prevention protocols
- Update emergency response procedures based on lessons learned`,
    category: 'fire',
    severity: 'critical',
    timeToRespond: '< 1 minute',
    requiredPersonnel: ['Fire Team', 'Marine Control', 'Bronze Command', 'All Crew'],
    keywords: ['fire', 'alarm', 'evacuation', 'firefighting', 'abandon ship', 'muster', 'extinguisher']
  },
  {
    id: "collision",
    title: "Collision",
    content: `
IMMEDIATE ACTIONS:
- Sound collision alarm
- Immediately stop all vessel movement if possible
- Assess for injuries, fire, flooding, or pollution risk
- Notify Gold/Silver Command and all relevant authorities (NPA, Coast Guard)

RESPONSE PROCEDURES:
- Muster crew and perform headcount
- Prepare for evacuation if needed
- Secure the vessel and assess damage
- Document collision circumstances and other vessel details

FOLLOW-UP:
- Report fully to maritime authorities
- Conduct after-action review and investigation
- Insurance and legal notifications
- Equipment and structural damage assessment`,
    category: 'marine',
    severity: 'high',
    timeToRespond: '< 3 minutes',
    requiredPersonnel: ['Bridge Team', 'Marine Control', 'Silver Command', 'All Crew'],
    keywords: ['collision', 'vessel', 'damage', 'authorities', 'evacuation', 'investigation']
  },
  {
    id: "grounding",
    title: "Grounding",
    content: `
IMMEDIATE ACTIONS:
- Raise the alarm; stop all engines
- Sound tank spaces for flooding/damage
- Muster crew and prepare for possible evacuation
- Notify Gold/Silver Command, Marine Department, and authorities

RESPONSE PROCEDURES:
- Assess for oil spills or environmental impact
- Prepare for refloating or lightering operations as directed
- Monitor stability and structural integrity
- Coordinate with salvage and environmental response teams

FOLLOW-UP:
- Full documentation and follow-up investigation
- Environmental impact assessment
- Structural survey and repairs
- Review navigation procedures and equipment`,
    category: 'marine',
    severity: 'high',
    timeToRespond: '< 5 minutes',
    requiredPersonnel: ['Bridge Team', 'Chief Engineer', 'Marine Superintendent', 'Environmental Team'],
    keywords: ['grounding', 'flooding', 'evacuation', 'refloating', 'environmental', 'stability']
  },
  {
    id: "oil-spill",
    title: "Oil Spill",
    content: `
IMMEDIATE ACTIONS:
- Raise the alarm and contain spill source immediately if safe
- Deploy spill response materials (booms, absorbents)
- Notify Gold/Silver Command, Environmental Authority, and NPA
- Record: location, volume, time, source, weather, personnel involved

RESPONSE PROCEDURES:
- Begin recovery/clean-up per spill response plan
- Coordinate with environmental response contractors
- Monitor environmental impact and wildlife
- Implement media and stakeholder communication plan

FOLLOW-UP:
- Document all actions and outcomes for reporting
- Environmental damage assessment
- Regulatory compliance and legal requirements
- Review spill prevention and response procedures`,
    category: 'environmental',
    severity: 'critical',
    timeToRespond: '< 10 minutes',
    requiredPersonnel: ['Environmental Team', 'Marine Control', 'Gold Command', 'External Contractors'],
    keywords: ['oil spill', 'environmental', 'containment', 'cleanup', 'pollution', 'authorities']
  },
  {
    id: "man-overboard",
    title: "Man Overboard",
    content: `
IMMEDIATE ACTIONS:
- Raise "Man Overboard" alarm immediately
- Throw lifebuoy/marker at person's location
- Appoint spotter; maintain constant visual contact
- Stop engines and maneuver vessel for recovery

RESPONSE PROCEDURES:
- Lower rescue boat if safe, or use recovery equipment
- Notify Gold/Silver Command and Medical Officer
- Coordinate with other vessels in area if available
- Prepare medical treatment for hypothermia/injuries

FOLLOW-UP:
- Log event, personnel involved, time, and recovery actions
- Medical assessment and treatment
- Investigation of circumstances
- Review safety procedures and personal protective equipment`,
    category: 'marine',
    severity: 'critical',
    timeToRespond: '< 30 seconds',
    requiredPersonnel: ['Bridge Team', 'Rescue Team', 'Medical Officer', 'All Available Crew'],
    keywords: ['man overboard', 'rescue', 'recovery', 'lifebuoy', 'hypothermia', 'safety']
  },
  {
    id: "security-threat",
    title: "Security Threat/Crime/Piracy/Kidnap",
    content: `
IMMEDIATE ACTIONS:
- Raise the alarm; secure all access points
- Notify Gold/Silver Command and authorities immediately
- Muster crew in safe zones or citadel if required
- Document description of threat/incident and personnel involved

RESPONSE PROCEDURES:
- Follow Gold Command instructions for escalation/negotiation
- Coordinate with naval/coast guard forces
- Implement lockdown procedures per security plan
- Prepare for potential evacuation or extended lockdown

FOLLOW-UP:
- Record all communications for investigation
- Debriefing with security specialists
- Legal and insurance notifications
- Review security procedures and training`,
    category: 'security',
    severity: 'critical',
    timeToRespond: '< 1 minute',
    requiredPersonnel: ['Security Team', 'Gold Command', 'All Crew', 'External Authorities'],
    keywords: ['security', 'threat', 'piracy', 'kidnap', 'lockdown', 'citadel', 'authorities']
  },
  {
    id: "missing-personnel",
    title: "Missing Personnel",
    content: `
IMMEDIATE ACTIONS:
- Conduct immediate roll call and search muster stations
- Interview witnesses; check last known location and CCTV if available
- Notify Gold/Silver Command and authorities
- Organize search party with safety gear and full communication

RESPONSE PROCEDURES:
- Systematic search of all vessel areas
- Coordinate with other vessels and aircraft in area
- Prepare for potential man overboard scenario
- Maintain regular communication with search teams

FOLLOW-UP:
- Log event, personnel involved, search actions, and outcome
- Prepare for media/HR communication as needed
- Family and next-of-kin notifications
- Review personnel accountability procedures`,
    category: 'operational',
    severity: 'high',
    timeToRespond: '< 15 minutes',
    requiredPersonnel: ['All Crew', 'Security Team', 'Silver Command', 'External Search Teams'],
    keywords: ['missing', 'personnel', 'search', 'accountability', 'witnesses', 'communication']
  },
  {
    id: "severe-weather",
    title: "High Winds/Heavy Swell/Severe Weather",
    content: `
IMMEDIATE ACTIONS:
- Secure all deck equipment and loose objects
- Halt operations in unsafe conditions
- Notify all crew of weather updates and muster location
- Monitor weather forecasts and vessel stability

RESPONSE PROCEDURES:
- Implement weather-specific operational procedures
- Consider vessel positioning and sea room
- Prepare for potential evacuation if conditions deteriorate
- Coordinate with meteorological services for updates

FOLLOW-UP:
- Stand down or resume work as directed by Silver/Gold Command
- Assess weather damage to equipment and structures
- Review weather response procedures
- Update operational weather limits if necessary`,
    category: 'weather',
    severity: 'medium',
    timeToRespond: '< 30 minutes',
    requiredPersonnel: ['Bridge Team', 'Operations Team', 'Silver Command'],
    keywords: ['weather', 'winds', 'swell', 'stability', 'operations', 'forecasts']
  },
  {
    id: "diving-emergency",
    title: "Diving Emergency",
    content: `
IMMEDIATE ACTIONS:
- Immediate call to Dive Supervisor and Medic
- Abort dive and bring diver(s) to surface or bell
- Administer first aid and start surface decompression if needed
- Notify Gold/Silver Command and record all times/events

RESPONSE PROCEDURES:
- Prepare for evacuation to medical facility if severe
- Coordinate with hyperbaric medical specialists
- Implement diving emergency medical procedures
- Secure diving equipment and preserve evidence

FOLLOW-UP:
- Log all details for investigation
- Medical follow-up and specialist treatment
- Diving equipment inspection and testing
- Review diving procedures and safety protocols`,
    category: 'diving',
    severity: 'critical',
    timeToRespond: '< 2 minutes',
    requiredPersonnel: ['Dive Supervisor', 'Dive Medic', 'Dive Team', 'Medical Specialist'],
    keywords: ['diving', 'decompression', 'hyperbaric', 'supervisor', 'medical', 'emergency']
  },
  {
    id: "food-poisoning",
    title: "Food Poisoning/Contaminated Water",
    content: `
IMMEDIATE ACTIONS:
- Notify Medical Officer and isolate affected personnel
- Identify and secure contaminated food/water source
- Inform Gold/Silver Command and document all cases
- Arrange medical treatment and sample collection for testing

RESPONSE PROCEDURES:
- Record batch numbers, suppliers, and staff on duty
- Implement food safety emergency procedures
- Coordinate with public health authorities
- Prepare for potential mass medical evacuation

FOLLOW-UP:
- Submit full incident report and review food safety protocols
- Investigation of supply chain and food handling
- Legal and regulatory compliance
- Update food safety training and procedures`,
    category: 'medical',
    severity: 'medium',
    timeToRespond: '< 1 hour',
    requiredPersonnel: ['Medical Officer', 'Catering Staff', 'HSE Officer', 'Public Health Authorities'],
    keywords: ['food poisoning', 'contamination', 'medical', 'samples', 'suppliers', 'health']
  }
];

export class ERPScenariosService {
  /**
   * Search scenarios by query string
   */
  static searchScenarios(query: string): ERPScenario[] {
    if (!query.trim()) return erpScenarios;
    
    const queryLower = query.toLowerCase();
    
    return erpScenarios.filter(scenario => 
      scenario.title.toLowerCase().includes(queryLower) ||
      scenario.content.toLowerCase().includes(queryLower) ||
      scenario.keywords.some(keyword => keyword.toLowerCase().includes(queryLower)) ||
      scenario.category.toLowerCase().includes(queryLower)
    );
  }
  
  /**
   * Get scenario by ID
   */
  static getScenarioById(id: string): ERPScenario | undefined {
    return erpScenarios.find(scenario => scenario.id === id);
  }
  
  /**
   * Get scenarios by category
   */
  static getScenariosByCategory(category: ERPScenario['category']): ERPScenario[] {
    return erpScenarios.filter(scenario => scenario.category === category);
  }
  
  /**
   * Get scenarios by severity
   */
  static getScenariosBySeverity(severity: ERPScenario['severity']): ERPScenario[] {
    return erpScenarios.filter(scenario => scenario.severity === severity);
  }
  
  /**
   * Get critical scenarios (for quick access)
   */
  static getCriticalScenarios(): ERPScenario[] {
    return erpScenarios.filter(scenario => scenario.severity === 'critical');
  }
  
  /**
   * Get scenario context for AI
   */
  static getScenarioContextForAI(scenarioId: string): string {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) return '';
    
    return `**Emergency Scenario: ${scenario.title}**
Category: ${scenario.category.toUpperCase()}
Severity: ${scenario.severity.toUpperCase()}
Response Time: ${scenario.timeToRespond}
Required Personnel: ${scenario.requiredPersonnel.join(', ')}

**Detailed Procedures:**
${scenario.content}`;
  }
}