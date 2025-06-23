/**
 * HydroSafe Emergency Response Plan - Questions & Answers Knowledge Base
 * Comprehensive Q&A extracted from official ERP documents for AI-powered guidance
 */

export interface ERPQuestion {
  id: string;
  question: string;
  answer: string;
  category: 'medical' | 'fire' | 'marine' | 'diving' | 'security' | 'weather' | 'general';
  scenario: string;
  commandLevel: 'bronze' | 'silver' | 'gold' | 'all';
  keywords: string[];
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export const erpQuestions: ERPQuestion[] = [
  // Medical Emergency Q&A
  {
    id: 'med-001',
    question: 'What should I do first when someone is seriously injured offshore?',
    answer: 'Ensure safety first - do not move the injured person unless necessary to remove them from immediate danger. Raise the alarm immediately and begin first aid or CPR if trained. Have the vessel\'s Medic or designated first aider take over treatment as soon as possible. Secure the incident area so it remains undisturbed for investigation.',
    category: 'medical',
    scenario: 'Serious Illness/Injury',
    commandLevel: 'bronze',
    keywords: ['injury', 'first aid', 'CPR', 'medical emergency', 'safety'],
    urgency: 'critical'
  },
  {
    id: 'med-002',
    question: 'When should we arrange medical evacuation (MEDEVAC)?',
    answer: 'Medical evacuation should be arranged immediately for serious injuries requiring hospital treatment. The Silver Emergency Coordinator consults with the company\'s diving medical doctor or Hyperbaric Medical Adviser for treatment guidance. Contact the client\'s medical support and available transport (helicopter or boat). Ensure receiving onshore medical facilities are alerted and ready.',
    category: 'medical',
    scenario: 'Medical Evacuation',
    commandLevel: 'silver',
    keywords: ['medevac', 'evacuation', 'helicopter', 'hospital', 'medical transport'],
    urgency: 'critical'
  },
  {
    id: 'med-003',
    question: 'What if multiple people have food poisoning symptoms?',
    answer: 'Multiple crew with food poisoning symptoms should be treated as a medical emergency. Follow medical evacuation procedures. Isolate affected personnel, provide supportive care, and document all symptoms. Investigate the food source immediately to prevent further cases. This may require full emergency response team activation.',
    category: 'medical',
    scenario: 'Food Poisoning Emergency',
    commandLevel: 'all',
    keywords: ['food poisoning', 'multiple casualties', 'isolation', 'investigation'],
    urgency: 'high'
  },

  // Fire Emergency Q&A
  {
    id: 'fire-001',
    question: 'What is the first action when fire is detected on a vessel?',
    answer: 'Immediately sound the general alarm at first sign of fire (sight or smell of smoke). Break the fire alarm glass and activate the alarm system. Announce the location of the fire over the PA system if possible. The Master takes charge and musters the trained fire-fighting team per the vessel\'s Muster List.',
    category: 'fire',
    scenario: 'Fire Onboard',
    commandLevel: 'bronze',
    keywords: ['fire', 'alarm', 'emergency', 'firefighting', 'master'],
    urgency: 'critical'
  },
  {
    id: 'fire-002',
    question: 'When should we abandon ship during a fire?',
    answer: 'Prepare to abandon ship if flames threaten vital areas (engine room, fuel tanks) or fire cannot be controlled with on-board resources. If smothering systems (CO₂ in engine room) and fire teams cannot contain the blaze without risking lives, the Master must not hesitate to give the order to abandon. Sound evacuation signal: seven short blasts + one long blast.',
    category: 'fire',
    scenario: 'Abandon Ship',
    commandLevel: 'bronze',
    keywords: ['abandon ship', 'evacuation', 'fire control', 'master decision'],
    urgency: 'critical'
  },
  {
    id: 'fire-003',
    question: 'How do we contain a fire onboard?',
    answer: 'Attack the fire with appropriate extinguishers or fixed suppression systems (CO₂, foam, water) depending on the source. Close fire dampers, fuel valves, and power to affected areas to starve the fire. Ensure all firefighters don proper PPE and breathing apparatus. Quick response is critical to prevent the fire from becoming uncontrollable.',
    category: 'fire',
    scenario: 'Fire Suppression',
    commandLevel: 'bronze',
    keywords: ['fire suppression', 'extinguisher', 'CO2', 'foam', 'containment'],
    urgency: 'critical'
  },

  // Marine Emergency Q&A
  {
    id: 'marine-001',
    question: 'What should I do if someone falls overboard (Man Overboard)?',
    answer: 'Immediately shout "MAN OVERBOARD" and throw a lifebuoy to the person. Sound the general alarm and execute the MOB maneuver. Post a lookout to keep visual contact with the person in water. Launch rescue boat if conditions permit. Send distress call with GPS coordinates. Deploy life rafts if person cannot be recovered quickly.',
    category: 'marine',
    scenario: 'Man Overboard',
    commandLevel: 'bronze',
    keywords: ['man overboard', 'MOB', 'rescue', 'lifebuoy', 'recovery'],
    urgency: 'critical'
  },
  {
    id: 'marine-002',
    question: 'How do we handle a vessel collision?',
    answer: 'Assess damage and take on water status immediately. Muster all crew and prepare to send distress call. Check for injuries and provide first aid. If taking on water, activate bilge pumps and damage control measures. Notify Silver Emergency Coordinator and nearby vessels. Document the incident thoroughly for investigation.',
    category: 'marine',
    scenario: 'Collision',
    commandLevel: 'bronze',
    keywords: ['collision', 'damage assessment', 'water ingress', 'distress call'],
    urgency: 'critical'
  },
  {
    id: 'marine-003',
    question: 'What actions are needed for vessel grounding?',
    answer: 'Stop engines immediately to prevent further damage. Assess hull integrity and check for water ingress. Sound tanks to determine extent of damage. Attempt to refloat if safe to do so, otherwise prepare for evacuation. Send distress call with exact position. Notify port authorities and marine salvage services.',
    category: 'marine',
    scenario: 'Grounding',
    commandLevel: 'bronze',
    keywords: ['grounding', 'hull damage', 'refloat', 'salvage', 'evacuation'],
    urgency: 'high'
  },

  // Diving Emergency Q&A
  {
    id: 'dive-001',
    question: 'How do we handle a diver who becomes unconscious underwater?',
    answer: 'Immediately deploy standby diver for rescue. Bring unconscious diver to surface following emergency ascent procedures. Be prepared for decompression illness treatment. Have recompression chamber ready and contact Diving Medical Officer. Provide CPR if needed once on surface. Document all dive parameters for medical assessment.',
    category: 'diving',
    scenario: 'Diver Unconscious',
    commandLevel: 'bronze',
    keywords: ['unconscious diver', 'emergency ascent', 'standby diver', 'recompression'],
    urgency: 'critical'
  },
  {
    id: 'dive-002',
    question: 'What if a diver reports decompression illness symptoms?',
    answer: 'Immediately place the diver on 100% oxygen and keep them lying flat. Contact the Diving Medical Officer or hyperbaric medical adviser immediately. Prepare recompression chamber for treatment. Document all symptoms, dive profile, and timing. Arrange medical evacuation if chamber treatment is insufficient. Never allow affected diver to return to work without medical clearance.',
    category: 'diving',
    scenario: 'Decompression Illness',
    commandLevel: 'bronze',
    keywords: ['decompression illness', 'DCI', 'oxygen', 'recompression', 'medical officer'],
    urgency: 'critical'
  },
  {
    id: 'dive-003',
    question: 'How do we handle a lost diver (umbilical failure)?',
    answer: 'Immediately deploy standby diver with emergency gas supply. Establish emergency communications if possible. The lost diver should switch to emergency gas and follow emergency procedures (ascent or emergency shelter). Surface support must track diver\'s last known position. Prepare rescue assets and medical support. Notify Emergency Coordinator immediately.',
    category: 'diving',
    scenario: 'Lost Diver/Umbilical Failure',
    commandLevel: 'bronze',
    keywords: ['lost diver', 'umbilical failure', 'emergency gas', 'standby diver'],
    urgency: 'critical'
  },

  // Security Emergency Q&A
  {
    id: 'sec-001',
    question: 'How should we respond to a security threat (piracy/armed attack)?',
    answer: 'Activate security alert immediately. All personnel to muster at designated secure areas. Send distress call including "SECURITY" prefix. Contact naval authorities and request immediate assistance. Do not resist if overwhelmed - crew safety is paramount. Implement lockdown procedures and destroy sensitive documents if time permits.',
    category: 'security',
    scenario: 'Security Threat',
    commandLevel: 'bronze',
    keywords: ['security threat', 'piracy', 'armed attack', 'muster', 'naval authorities'],
    urgency: 'critical'
  },
  {
    id: 'sec-002',
    question: 'What if someone goes missing offshore?',
    answer: 'Immediately conduct thorough search of vessel/facility. Check muster lists and last known locations. If person cannot be found, assume man overboard and initiate MOB procedures. Sound general alarm and deploy search teams. Notify Emergency Coordinator and coast guard. Continue search until person is found or rescue services take over.',
    category: 'security',
    scenario: 'Missing Personnel',
    commandLevel: 'bronze',
    keywords: ['missing person', 'search', 'man overboard', 'muster list'],
    urgency: 'critical'
  },

  // Weather Emergency Q&A
  {
    id: 'weather-001',
    question: 'When should operations stop due to severe weather?',
    answer: 'Operations must stop when weather exceeds safe operational limits defined in the project safety plan. Monitor weather forecasts continuously. Secure all equipment and prepare for heavy weather procedures. Consider evacuation if conditions threaten vessel safety. All diving operations stop immediately in severe weather.',
    category: 'weather',
    scenario: 'Severe Weather',
    commandLevel: 'bronze',
    keywords: ['severe weather', 'operational limits', 'evacuation', 'diving stop'],
    urgency: 'high'
  },
  {
    id: 'weather-002',
    question: 'How do we secure the vessel in storm conditions?',
    answer: 'Implement heavy weather checklist: secure all loose items, close watertight doors, check bilge pumps, test emergency equipment. Brief crew on storm procedures. Maintain dynamic positioning if equipped, otherwise seek shelter or move to safer waters. Monitor vessel stress and be prepared for emergency procedures.',
    category: 'weather',
    scenario: 'Storm Procedures',
    commandLevel: 'bronze',
    keywords: ['storm', 'heavy weather checklist', 'watertight doors', 'dynamic positioning'],
    urgency: 'high'
  },

  // General Command & Control Q&A
  {
    id: 'gen-001',
    question: 'What is the role of Bronze Command in an emergency?',
    answer: 'Bronze Command is the On-Scene Commander responsible for immediate hands-on response, initial containment, and crew safety. Bronze handles tactical decisions at the incident location and maintains communication with Silver Command for resource support and strategic guidance.',
    category: 'general',
    scenario: 'Command Structure',
    commandLevel: 'bronze',
    keywords: ['bronze command', 'on-scene commander', 'tactical response'],
    urgency: 'medium'
  },
  {
    id: 'gen-002',
    question: 'When should Silver Command be notified?',
    answer: 'Silver Command (Emergency Coordinator) should be notified immediately for any emergency requiring external resources, medical evacuation, or potentially escalating situations. Silver coordinates overall response, mobilizes resources, and maintains communication with external authorities and Gold Command.',
    category: 'general',
    scenario: 'Command Structure',
    commandLevel: 'silver',
    keywords: ['silver command', 'emergency coordinator', 'external resources'],
    urgency: 'medium'
  },
  {
    id: 'gen-003',
    question: 'What triggers Gold Command activation?',
    answer: 'Gold Command activates for major incidents involving fatalities, multiple casualties, environmental damage, media attention, or potential legal implications. Gold focuses on strategic decisions, stakeholder communications, resource allocation, and high-level crisis management.',
    category: 'general',
    scenario: 'Command Structure',
    commandLevel: 'gold',
    keywords: ['gold command', 'strategic decisions', 'major incidents', 'crisis management'],
    urgency: 'medium'
  },

  // Equipment & Systems Q&A
  {
    id: 'equip-001',
    question: 'What if dynamic positioning (DP) system fails during operations?',
    answer: 'Immediately sound alarm and notify all personnel. Stop all operations that depend on precise positioning. Deploy anchors if safe and possible. If divers are in water, recover them immediately. Prepare for emergency departure from location. Test backup systems and consider moving to safe waters.',
    category: 'marine',
    scenario: 'DP System Failure',
    commandLevel: 'bronze',
    keywords: ['dynamic positioning', 'DP failure', 'anchors', 'emergency departure'],
    urgency: 'critical'
  },
  {
    id: 'equip-002',
    question: 'How do we handle power blackout during diving operations?',
    answer: 'Emergency generators should activate automatically. Check life support systems for divers immediately. If saturation diving, ensure chamber life support is on emergency power. Recover working divers safely using emergency procedures. Test all critical systems and consider aborting operations if power cannot be restored quickly.',
    category: 'diving',
    scenario: 'Power Failure',
    commandLevel: 'bronze',
    keywords: ['power blackout', 'emergency generators', 'life support', 'saturation diving'],
    urgency: 'critical'
  }
];

export class ERPQnAService {
  /**
   * Search Q&A database by question text or keywords
   */
  static searchQuestions(query: string, limit: number = 10): ERPQuestion[] {
    const searchTerm = query.toLowerCase();
    
    return erpQuestions
      .filter(qa => 
        qa.question.toLowerCase().includes(searchTerm) ||
        qa.answer.toLowerCase().includes(searchTerm) ||
        qa.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
        qa.scenario.toLowerCase().includes(searchTerm)
      )
      .sort((a, b) => {
        // Prioritize by urgency: critical > high > medium > low
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      })
      .slice(0, limit);
  }

  /**
   * Get questions by category
   */
  static getQuestionsByCategory(category: ERPQuestion['category']): ERPQuestion[] {
    return erpQuestions.filter(qa => qa.category === category);
  }

  /**
   * Get questions by command level
   */
  static getQuestionsByCommandLevel(level: ERPQuestion['commandLevel']): ERPQuestion[] {
    return erpQuestions.filter(qa => qa.commandLevel === level || qa.commandLevel === 'all');
  }

  /**
   * Get critical/high urgency questions for quick reference
   */
  static getCriticalQuestions(): ERPQuestion[] {
    return erpQuestions.filter(qa => qa.urgency === 'critical' || qa.urgency === 'high');
  }

  /**
   * Get Q&A context for AI prompts
   */
  static getQnAContextForAI(query: string): string {
    const relevantQAs = this.searchQuestions(query, 3);
    
    if (relevantQAs.length === 0) {
      return 'No specific Q&A found for this query. Refer to general emergency protocols.';
    }

    return relevantQAs.map(qa => 
      `Q: ${qa.question}\nA: ${qa.answer}\n[Category: ${qa.category}, Command Level: ${qa.commandLevel}, Urgency: ${qa.urgency}]`
    ).join('\n\n');
  }

  /**
   * Get emergency guidance for specific scenarios
   */
  static getEmergencyGuidance(scenario: string, commandLevel?: string): ERPQuestion[] {
    return erpQuestions.filter(qa => 
      qa.scenario.toLowerCase().includes(scenario.toLowerCase()) &&
      (!commandLevel || qa.commandLevel === commandLevel || qa.commandLevel === 'all')
    );
  }

  /**
   * Get all scenarios with Q&A available
   */
  static getAvailableScenarios(): string[] {
    const scenarios = new Set(erpQuestions.map(qa => qa.scenario));
    return Array.from(scenarios).sort();
  }
}