export const protocolExcerpts = {
  imca: [
    {
      section: "IMCA D 014 - Section 5.2",
      text: "Dynamic positioning vessel operations must maintain station keeping within specified tolerances. All critical safety systems must be verified before operations commence."
    },
    {
      section: "IMCA D 014 - Section 4.1", 
      text: "Backup evacuation routes must be documented and regularly tested. Personnel must be familiar with primary and secondary escape routes."
    },
    {
      section: "IMCA M 140 - Section 3.1",
      text: "Incident reporting must occur within 2 hours of occurrence. Initial assessment required within 30 minutes with photo documentation mandatory."
    },
    {
      section: "IMCA R 004 - Section 7.2",
      text: "Emergency procedures must follow Bronze-Silver-Gold command structure. All emergency actions require dual authorization for CRITICAL level incidents."
    }
  ],
  iogp: [
    {
      section: "IOGP Report 456 - KPI Framework",
      text: "Asset integrity KPIs must be tracked and documented with verification intervals: Fire suppression (monthly), Life support (weekly). Non-compliance triggers immediate corrective action."
    },
    {
      section: "IOGP Report 510 - Section 8.4",
      text: "Operating Management System requires immediate response team activation for HIGH/CRITICAL incidents. All stakeholders must be notified according to escalation matrix."
    },
    {
      section: "IOGP Report 478 - Section 8",
      text: "Triage procedures required for multiple casualties. Medical equipment and trained personnel must be available within 5 minutes of incident notification."
    }
  ],
  hydrodive: [
    {
      section: "HydroDive ERP 7.4 - Asset Verification",
      text: "All asset inspections require photographic proof with GPS coordinates and timestamp. Verification must include visual inspection, functional testing, and documentation review."
    },
    {
      section: "HydroDive ERP 9.2 - Emergency Response Chain",
      text: "Bronze (OSC) - On Scene Coordinator responsible for immediate response. Silver (EC) - Emergency Coordinator manages tactical response. Gold (GM) - General Manager provides strategic oversight."
    },
    {
      section: "HydroDive ERP 19-24 - Medevac Procedures",
      text: "Primary: Helicopter evacuation with 10-minute confirmation, 50-minute flight time. Secondary: Surfer Boat (Ose Anita 4) with 75-90 minute timeline depending on weather conditions."
    },
    {
      section: "HydroDive ERP 26-36 - Emergency Scenarios",
      text: "Medical emergencies require immediate first aid, OSC notification, and EC contact. Fire onboard requires alarm activation, muster point assembly, and emergency equipment deployment."
    },
    {
      section: "HydroDive ERP 47-64 - Diving Emergencies",
      text: "Loss of communications requires immediate surface recall. Air supply issues trigger emergency ascent procedures. Diver recovery operations must follow established LARS (Launch and Recovery System) protocols."
    }
  ],
  shellSpdc: [
    {
      section: "Shell SPDC Emergency Response Plan - Section 4.2",
      text: "Forcados Terminal operations require continuous environmental monitoring. Oil spill response equipment must be deployed within 15 minutes of detection."
    },
    {
      section: "Shell SPDC Security Protocols - Section 6.1",
      text: "Piracy threat assessment must be conducted daily. Armed escort vessels required for all personnel transfers in designated high-risk areas."
    }
  ]
};

export const emergencyContacts = {
  medical: [
    { name: "Prime Medical Consultants Clinic PHC", phone: "+234 8033134822", role: "Primary Medical", responseTime: "24/7" },
    { name: "Warri Central Hospital", phone: "+234 8055123456", role: "Secondary Medical", responseTime: "24/7" },
    { name: "Lagos University Teaching Hospital", phone: "+234 8011234567", role: "Tertiary Medical", responseTime: "24/7" }
  ],
  evacuation: [
    { name: "HD Contender Captain", phone: "+1 281 824 1970", email: "captain@hdcontender.com", role: "Vessel Command" },
    { name: "Helicopter Services Nigeria", phone: "+234 8099876543", role: "Primary Medevac", responseTime: "50 minutes" },
    { name: "Ose Anita 4 Captain", phone: "+234 8077654321", role: "Secondary Evacuation", responseTime: "75-90 minutes" }
  ],
  authorities: [
    { name: "Nigerian Navy - Delta Command", phone: "+234 8033445566", role: "Security Response" },
    { name: "NIMASA Emergency", phone: "+234 8044556677", role: "Maritime Authority" },
    { name: "Shell SPDC Emergency Centre", phone: "+234 8055667788", role: "Client Emergency" }
  ]
};

export const commandStructure = {
  bronze: {
    title: "On Scene Coordinator (OSC)",
    role: "Offshore Construction Manager or designated senior person",
    responsibilities: [
      "Immediate incident response and scene management",
      "First aid application and casualty assessment", 
      "Alarm activation and personnel mustering",
      "Initial incident reporting to Silver command",
      "Evidence preservation and witness coordination"
    ],
    authorities: [
      "Order immediate evacuation if required",
      "Deploy emergency equipment and resources",
      "Coordinate with vessel command for safety measures"
    ]
  },
  silver: {
    title: "Emergency Coordinator (EC)", 
    role: "Project Manager or Designated Person Ashore",
    responsibilities: [
      "Tactical emergency response coordination",
      "External resource mobilization (medevac, medical)",
      "Stakeholder notification and communication",
      "Incident escalation assessment",
      "Resource allocation and logistics support"
    ],
    authorities: [
      "Authorize helicopter or boat evacuation",
      "Coordinate with external emergency services",
      "Make tactical decisions for incident resolution"
    ]
  },
  gold: {
    title: "General Manager (GM)",
    role: "Strategic emergency response leader", 
    responsibilities: [
      "Strategic oversight and policy decisions",
      "Media and regulatory communication",
      "Corporate resource authorization",
      "Long-term incident impact assessment",
      "Lessons learned and improvement implementation"
    ],
    authorities: [
      "Authorize major resource expenditure",
      "Make strategic business continuity decisions",
      "Interface with government and regulatory bodies"
    ]
  }
};

export const complianceRequirements = {
  assetVerification: {
    fireSuppressionSystems: {
      frequency: "Monthly",
      requirements: ["Visual inspection", "Pressure testing", "Photographic evidence", "GPS coordinates"],
      protocols: ["HydroDive ERP 7.4", "IOGP Report 456"]
    },
    lifeSupportSystems: {
      frequency: "Weekly", 
      requirements: ["Functional testing", "Emergency backup verification", "Documentation review"],
      protocols: ["IMCA D 014 Section 4.1", "HydroDive ERP 7.4"]
    },
    communicationSystems: {
      frequency: "Daily",
      requirements: ["Radio check", "Satellite communication test", "Emergency frequencies"],
      protocols: ["IMCA R 004 Section 7.2", "HydroDive ERP 47-64"]
    }
  },
  incidentReporting: {
    timeframes: {
      immediate: "Within 30 minutes - Initial assessment and first aid",
      shortTerm: "Within 2 hours - Formal incident report",
      mediumTerm: "Within 24 hours - Detailed investigation report",
      longTerm: "Within 7 days - Corrective action plan"
    },
    requiredEvidence: ["Photographs", "Witness statements", "Medical reports", "Equipment inspection logs"],
    protocols: ["IMCA M 140 Section 3.1", "Shell SPDC Emergency Response Plan"]
  },
  medicalEmergencies: {
    responseChain: [
      "Apply immediate first aid",
      "Notify OSC (Bronze command)",
      "Contact EC (Silver command) within 5 minutes",
      "Activate medevac if required",
      "Coordinate with medical consultants"
    ],
    equipmentRequirements: ["First aid kit", "AED", "Emergency oxygen", "Spinal board"],
    protocols: ["IOGP Report 478 Section 8", "HydroDive ERP 26-36"]
  }
};