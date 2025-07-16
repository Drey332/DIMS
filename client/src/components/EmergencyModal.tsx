import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import Fuse from "fuse.js";
// Team member type from Firestore
type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: "GOLD" | "SILVER" | "BRONZE";
  title?: string;
  phone?: string;
};

type EmergencyModalProps = {
  open: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
};

// Normalize helper to compare keywords case/diacritic/punctuation-insensitive
function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Full, typo-tolerant keyword matching for all major emergency scenarios
export const emergencyKeywords = [
  // FIRE / EXPLOSION / SMOKE
  {
    keywords: [
      "fire", "firee", "fier", "fyr", "smoke", "smooke", "smok", "smoulder", "smolder", "burn", "burnt", "burning",
      "explosion", "explod", "xplosion", "blast", "blaze", "flames", "flamme", "flam", "sparks", "spark", "alarm", "fire alarm",
      "overheat", "overheating", "over heated", "combustion", "ship fire", "vessel fire", "accommodation fire", "galley fire",
      "engine room fire", "paint locker fire", "deck fire", "electrical fire", "electrica fire", "short circuit", "shortcircuit", "ignition", "ignited",
      "flaming", "abandon ship", "evacuation", "evacuate", "evac", "outbreak", "fireoutbreak", "hot work", "hotwork"
    ],
    type: "Fire/Evacuation",
    notify: ["GOLD", "SILVER", "BRONZE"],
    protocol: [
      "Sound the alarm immediately and shout 'FIRE, FIRE, FIRE!'",
      "Stop all ongoing operations and secure hazardous equipment.",
      "Evacuate all personnel from the immediate danger area.",
      "Muster all crew at designated muster points; conduct a headcount.",
      "Isolate fuel, oxygen, and electrical sources if safe to do so.",
      "Use appropriate fire extinguishers ONLY if safe (never take unnecessary risks).",
      "Close all doors, hatches, and ventilation to prevent fire spread.",
      "Notify GOLD, SILVER, and BRONZE command.",
      "Await further instructions from command and emergency services.",
      "Record and report any missing personnel."
    ].join("\n")
  },

  // MAN OVERBOARD / PERSON OVERBOARD
  {
    keywords: [
      "man overboard", "mob", "over board", "overbord", "man over bord", "fell overboard", "fell in water", "fall in water",
      "gone overboard", "person in water", "person overboard", "crew overboard", "over board", "person missing water", "crew missing water",
      "crew lost", "lost at sea", "swimmer in water", "person fell", "fell from deck", "fall from deck", "drowned", "drown", "floating in water", "seen in water", "dropped overboard", "disappeared at sea"
    ],
    type: "Man Overboard",
    notify: ["BRONZE", "SILVER", "GOLD"],
    protocol: [
      "Immediately shout 'MAN OVERBOARD!' and sound the alarm.",
      "Throw a life ring or flotation device toward the person in the water.",
      "Assign a crew member to maintain constant visual contact and point at the person.",
      "Stop engines and, if possible, maneuver vessel for rescue.",
      "Launch rescue boat or fast rescue craft without delay.",
      "Broadcast 'Man Overboard' on radio to all nearby vessels.",
      "Notify BRONZE, SILVER, and GOLD command team.",
      "Initiate a search and rescue operation; use available spotlights at night.",
      "Provide first aid as soon as the person is recovered."
    ].join("\n")
  },

  // SECURITY EMERGENCIES (PIRACY, KIDNAP, BANDITRY, CRIME, TERRORISM)
  {
    keywords: [
      "pirate", "piracy", "pirat", "terrorist", "terrorism", "terror attack", "militant", "militancy", "kidnap", "kidnapping", "kidnaping",
      "bandit", "banditry", "attack", "armed attack", "armed men", "security breach", "intruder", "armed boarding", "armed robbery",
      "hostage", "taken hostage", "abducted", "abduction", "gunshot", "gun fire", "gunfire", "robbery", "robbery", "vessel hijack", "vessel jacked", "vessel jacking", "threat",
      "criminal", "violent", "aggression", "assault", "weapon", "gun", "shooting", "hostile", "dangerous person", "unidentified boat", "unknown vessel", "piracy attack", "terror", "pirate attack", "shot fired", "shooting"
    ],
    type: "Security Emergency",
    notify: ["GOLD", "SILVER", "SPDC Security", "BRONZE"],
    protocol: [
      "Activate security/lockdown protocol immediately.",
      "Secure all external access points and gather all personnel in safe zones.",
      "Keep low and out of sight from windows/doors.",
      "Do NOT resist if boarded; cooperate to protect lives.",
      "Silence unnecessary communications, but maintain radio watch on emergency channel.",
      "Notify GOLD, SILVER, BRONZE, and SPDC Security team.",
      "If possible, transmit a distress message and continuously update command on the situation.",
      "Keep a record of events and all communications.",
      "Do not attempt any rescue without explicit authorization from command."
    ].join("\n")
  },

  // OIL SPILL / POLLUTION / HYDROCARBON RELEASE
  {
    keywords: [
      "oil spill", "spill", "spil", "pollution", "pollute", "oil leak", "leak", "spillage", "discharge", "spilled oil",
      "bunker spill", "hydrocarbon release", "hydrocarbon spill", "hydrocarbon leak", "environmental", "spilt oil", "polluted water", "oily water", "oil in water", "oil sheen", "sheen", "slick", "fuel spill", "fuel leakage", "chemical spill", "contamination"
    ],
    type: "Oil Spill/Pollution",
    notify: ["GOLD", "SILVER", "BRONZE", "SPDC HSE"],
    protocol: [
      "Stop all operations, transfers, or discharge immediately.",
      "Isolate the leak/source if safe to do so.",
      "Deploy oil spill containment equipment (booms, skimmers, absorbents).",
      "Close scuppers and overboard valves to prevent oil reaching water.",
      "Raise the alarm and notify command (GOLD, SILVER, BRONZE, HSE).",
      "Record time, location, volume, type of oil, and affected area.",
      "Take photos or video if possible and safe.",
      "Prepare to cooperate with authorities and provide all information for incident reporting."
    ].join("\n")
  },

  // SERIOUS INJURY / ILLNESS / FATALITY / MEDICAL EMERGENCY / MEDEVAC
  {
    keywords: [
      "unconscious", "unconcious", "unconscience", "no response", "not breathing", "injured", "injury", "injure", "injuries",
      "collapse", "collapsed", "faint", "lifeless", "passed out", "blackout", "ill", "sick", "illness", "sickness", "hurt", "medical", "medic", "emergency", "doctor", "blood", "bleeding", "bled", "fracture", "broken", "bone", "pain", "cut", "cutting", "amputation", "bruise", "accident", "fatal", "fatality", "death", "mortal", "heart attack", "chest pain", "food poisoning", "poisoning", "poisoned", "Medevac", "medivac", "evac", "evacuate casualty", "emergency case", "medical evacuation"
    ],
    type: "Medical Emergency",
    notify: ["Onsite Medical", "GOLD", "SILVER", "BRONZE"],
    protocol: [
      "Raise the alarm immediately and call for medical assistance.",
      "Move the casualty to a safe area, if possible.",
      "Provide first aid according to your level of training (CPR, stop bleeding, treat for shock, etc).",
      "Do NOT move casualty if there is suspected spinal injury unless in immediate danger.",
      "Notify onsite Medical, GOLD, SILVER, and BRONZE.",
      "Prepare casualty and documentation for possible medical evacuation (MEDEVAC).",
      "Maintain communication with command and await further medical instructions.",
      "Ensure a record is kept of actions taken, vital signs, and time of events."
    ].join("\n")
  },

  // MISSING PERSONNEL / UNACCOUNTED FOR (NOT OVERBOARD)
  {
    keywords: [
      "missing person", "personnel missing", "crew missing", "staff missing", "worker missing", "gone missing", "unaccounted for", "disappeared", "not found", "absent", "absconded", "couldn't find", "missing from muster", "missing crew member"
    ],
    type: "Missing Personnel",
    notify: ["GOLD", "SILVER", "BRONZE"],
    protocol: [
      "Sound the alarm and announce 'Missing Personnel.'",
      "Immediately check muster lists and conduct headcount at all muster points.",
      "Search all cabins, work areas, and common spaces.",
      "Notify GOLD, SILVER, and BRONZE.",
      "Continue search until the person is found or the situation is escalated.",
      "Record time, locations searched, and last known position.",
      "Update command at regular intervals."
    ].join("\n")
  },

  // COLLISION / GROUNDING / VESSEL DAMAGE
  {
    keywords: [
      "collision", "collide", "collided", "crash", "crashed", "hit", "grounding", "grounded", "ran aground", "stranded", "vessel damage", "structural damage", "impacted", "struck", "sideswipe", "rammed", "hit the dock", "hit platform", "allision", "contact with vessel", "contact with object", "crashed with"
    ],
    type: "Collision/Grounding",
    notify: ["GOLD", "SILVER", "BRONZE", "SPDC Marine"],
    protocol: [
      "Sound the general alarm and announce collision/grounding.",
      "Stop engines and assess the situation.",
      "Account for all crew and check for injuries or missing persons.",
      "Check for flooding, hull damage, and risk of pollution/oil spill.",
      "Close watertight doors and hatches as appropriate.",
      "Notify GOLD, SILVER, BRONZE, and Marine team.",
      "Prepare damage control measures and standby for further orders.",
      "Record all actions and observations for the incident log."
    ].join("\n")
  },

  // DIVING: UNCONSCIOUS / INJURED DIVER
  {
    keywords: [
      "diver unconscious", "diver not breathing", "unconscious diver", "injured diver", "collapse diver", "diver fainted",
      "diver accident", "diver medical", "diver hurt", "diver bleeding", "diver pain", "diver trauma", "diver lost consciousness", "diver passed out", "diver non responsive", "diver rescue"
    ],
    type: "Diver Unconscious/Injured",
    notify: ["SILVER", "Onsite Medical", "GOLD"],
    protocol: [
      "Sound diver emergency alarm and halt all operations.",
      "Deploy standby diver for immediate rescue.",
      "Recover the casualty to surface or chamber as quickly and safely as possible.",
      "Initiate first aid and life support, including CPR if needed.",
      "Notify Onsite Medical, SILVER, and GOLD.",
      "Prepare for hyperbaric treatment or medevac as appropriate.",
      "Record incident details, actions taken, and vital signs."
    ].join("\n")
  },

  // DIVING: FOULED / TRAPPED DIVER
  {
    keywords: [
      "trapped diver", "fouled diver", "diver stuck", "diver entangled", "diver snagged", "diver caught", "diver tangled",
      "diver jammed", "diver unable to move", "diver can't surface", "diver can't ascend", "diver fouling", "diver can’t move", "diver immobilized", "diver blocked"
    ],
    type: "Fouled/Trapped Diver",
    notify: ["SILVER", "ROV Operator", "GOLD"],
    protocol: [
      "Stop all vessel movement and equipment operation immediately.",
      "Attempt communication with the diver; instruct not to panic.",
      "Deploy ROV if available to assess and assist.",
      "Deploy standby diver for rescue if safe.",
      "Notify SILVER, ROV Operator, and GOLD.",
      "Follow supervisor’s instructions and keep command informed.",
      "Prepare for casualty recovery and possible medevac."
    ].join("\n")
  },

  // DIVING: LOSS OF AIR SUPPLY / COMPRESSOR FAIL
  {
    keywords: [
      "loss of air", "no air", "compressor fail", "compressor failure", "compressor down", "no gas", "rupture", "low pressure", "air supply lost", "air loss", "breathing gas lost", "gas loss", "oxygen fail", "no oxygen", "no breathing gas", "diver out of air", "lost air supply", "gas supply problem"
    ],
    type: "Loss of Air Supply",
    notify: ["SILVER", "GOLD"],
    protocol: [
      "Instruct diver to switch to emergency or bailout air supply.",
      "Recover diver to surface or bell immediately.",
      "Stop operations, check and isolate failed system.",
      "Notify SILVER and GOLD.",
      "Investigate cause and do not resume operations until confirmed safe.",
      "Record details and actions taken."
    ].join("\n")
  },

  // DIVING: LOSS OF COMMS / RADIO FAIL
  {
    keywords: [
      "loss of comms", "radio lost", "radio fail", "radio down", "lost comms", "communication down", "comms lost", "cant hear diver", "diver not responding", "lost audio", "comms problem", "talkback fail", "radio silence", "signal lost", "no signal", "radio silence", "no sound", "can’t talk", "cannot hear", "no response diver"
    ],
    type: "Loss of Communication",
    notify: ["SILVER", "GOLD"],
    protocol: [
      "Stop winches, vessel movement, and equipment operations.",
      "Attempt to reestablish communications with diver.",
      "Deploy standby diver if communications cannot be restored quickly.",
      "Recover diver to surface or bell.",
      "Notify SILVER and GOLD.",
      "Record all times, actions, and results."
    ].join("\n")
  },

  // DIVING: CONTAMINATED GAS
  {
    keywords: [
      "contaminated gas", "bad gas", "dirty gas", "toxic gas", "polluted gas", "bad air", "gas smell", "gas taste", "strange air", "air contamination", "bad odour", "bad odor", "foul air"
    ],
    type: "Contaminated Gas",
    notify: ["SILVER", "GOLD", "Onsite Medical"],
    protocol: [
      "Immediately switch diver to alternative safe gas supply.",
      "Recover diver to surface or chamber as soon as possible.",
      "Provide first aid and medical attention as required.",
      "Notify Onsite Medical, SILVER, and GOLD.",
      "Secure contaminated supply and retain sample for analysis.",
      "Do not use gas supply until cleared by qualified personnel."
    ].join("\n")
  },

  // DP FAILURE / LOSS OF POSITION / DRIFTING
  {
    keywords: [
      "dp fail", "dp failure", "dp system", "loss of dp", "dynamic positioning fail", "lost position", "loss of position", "station keeping fail", "drifting", "vessel adrift", "lost heading", "off station", "vessel not holding", "position error", "lost station keeping"
    ],
    type: "DP Failure/Loss of Position",
    notify: ["GOLD", "SILVER", "BRONZE"],
    protocol: [
      "Sound alarm and alert bridge and deck crew.",
      "Stop operations and secure all equipment.",
      "Attempt to regain position using manual controls.",
      "Prepare to disconnect or abort operations if necessary.",
      "Notify GOLD, SILVER, and BRONZE.",
      "Monitor position, heading, and environmental conditions.",
      "Record times and all actions taken."
    ].join("\n")
  },

  // LARS FAILURE / LAUNCH & RECOVERY / WINCH FAILURE
  {
    keywords: [
      "lars fail", "lars failure", "lars down", "launch and recovery fail", "launch fail", "recovery fail", "winch fail", "winch failure", "winch jammed", "diver launch fail", "recovery equipment fail", "launch recovery problem"
    ],
    type: "LARS Failure",
    notify: ["SILVER", "GOLD"],
    protocol: [
      "Stop all launch and recovery operations.",
      "Assess the situation; ensure diver is safe and not at risk.",
      "Attempt to recover diver using alternative method if necessary.",
      "Notify SILVER and GOLD.",
      "Do not resume use of failed equipment until repaired and checked.",
      "Record incident for maintenance and reporting."
    ].join("\n")
  },

  // HELICOPTER / AIRCRAFT INCIDENT
  {
    keywords: [
      "helicopter ditch", "helicopter crash", "helo down", "helo crash", "helicopter emergency", "chopper crash", "chopper down", "helicopter accident", "helicopter landed water", "helicopter water landing", "aircraft crash", "plane crash", "aircraft emergency", "air emergency"
    ],
    type: "Helicopter Ditching/Accident",
    notify: ["GOLD", "SILVER", "BRONZE"],
    protocol: [
      "Sound alarm and alert all personnel.",
      "Notify GOLD, SILVER, and BRONZE.",
      "Prepare for possible search and rescue; launch rescue craft if safe.",
      "Maintain radio communication with helicopter/aircraft.",
      "Muster all personnel; check for injuries or missing persons.",
      "Document all actions and information for authorities."
    ].join("\n")
  },
  { // HELICOPTER / AIRCRAFT INCIDENT
      keywords: [
        "helicopter ditch", "helicopter crash", "helo down", "helo crash", "helicopter emergency", "chopper crash", "chopper down", "helicopter accident", "helicopter landed water", "helicopter water landing", "aircraft crash", "plane crash", "aircraft emergency", "air emergency"
      ],
      type: "Helicopter Ditching/Accident",
      notify: ["GOLD", "SILVER", "BRONZE"],
      protocol: [
        "Sound alarm and alert all personnel.",
        "Notify GOLD, SILVER, and BRONZE.",
        "Prepare for possible search and rescue; launch rescue craft if safe.",
        "Maintain radio communication with helicopter/aircraft.",
        "Muster all personnel; check for injuries or missing persons.",
        "Document all actions and information for authorities."
      ].join("\n")
    }
  ]; // <--- CLOSE THE ARRAY AND STATEMENT HERE!

// Flatten all keywords for fuzzy search with Fuse.js
const fuseData = emergencyKeywords.flatMap(scenario =>
  scenario.keywords.map(keyword => ({
    keyword,
    type: scenario.type,
    notify: scenario.notify,
    protocol: scenario.protocol
  }))
);

// Fuse.js options (tweak threshold as needed)
const fuseOptions = {
  keys: ["keyword"],
  threshold: 0.34, // Lower = stricter, higher = more fuzzy
  includeScore: true,
};
const fuse = new Fuse(fuseData, fuseOptions);

//To analyze the keyword


function analyzeEmergency(description: string) {
  if (!description) return null;
  const desc = normalize(description);

  // Try exact match first for speed/precision
  for (const scenario of emergencyKeywords) {
    for (const k of scenario.keywords) {
      if (desc.includes(normalize(k))) {
        return scenario;
      }
    }
  }

  // Fallback to Fuse.js fuzzy search for typos/misspellings
  const results = fuse.search(desc);
  if (results.length > 0) {
    // Optionally: If desc is long, split and match the most likely keyword.
    return {
      type: results[0].item.type,
      notify: results[0].item.notify,
      protocol: results[0].item.protocol,
      matchedKeyword: results[0].item.keyword, // for debugging
      // score: results[0].score, // optional, remove if not needed
    };
  }
  return null;
}

// Observation form types
interface ObservationForm {
  type: string[];
  location: string;
  vessel: string;
  system: string;
  client: string;
  observation: string;
  corrective: string;
  recommendation: string;
  closedOut: string;
  name: string;
  sign: string;
  date: string;
  stopWork: boolean;
  photo: File | null;
}
const defaultForm: ObservationForm = {
  type: [],
  location: "",
  vessel: "",
  system: "",
  client: "",
  observation: "",
  corrective: "",
  recommendation: "",
  closedOut: "",
  name: "",
  sign: "",
  date: new Date().toISOString().substring(0, 10),
  stopWork: false,
  photo: null,
};
const incidentTypes = [
  "Unsafe Act",
  "Unsafe Condition",
  "Unsafe Procedure",
  "Safe Act/Good Practice",
  "Safe Condition",
  "Near-miss"
];

// Main component
const EmergencyModal: React.FC<EmergencyModalProps> = ({ open, onClose, teamMembers }) => {
  const [activeTab, setActiveTab] = useState<"emergency" | "observation">("emergency");
  const [emergencyDesc, setEmergencyDesc] = useState("");
  const match = analyzeEmergency(emergencyDesc);
  const [form, setForm] = useState<ObservationForm>(defaultForm);

  // Emergency submit
  async function handleEmergencySubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let notifiedContacts: any[] = [];
      if (match) {
        notifiedContacts = match.notify.flatMap(role =>
          (teamMembers ?? [])
            .filter(tm => tm.role === role)
            .map(tm => ({
              roleKey: role,
              name: tm.firstName + " " + tm.lastName,
              phone: tm.phone,
              title: tm.title
            }))
        );
      }
      await addDoc(collection(db, "emergencies"), {
        type: match?.type || "Other",
        title: match?.type || emergencyDesc,
        description: emergencyDesc,
        priority: "CRITICAL",
        status: "ACTIVE",
        startTime: new Date().toISOString(),
        notifiedContacts,
        createdAt: new Date().toISOString()
      });
      alert("Emergency report submitted!");
      setEmergencyDesc("");
      onClose();
    } catch (error) {
      alert("Critical error occurred. Please check the console for more information.");
      // eslint-disable-next-line no-console
      console.error("Error in handleEmergencySubmit:", error);
    }
  }

  // Observation submit
  function handleObsChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type, checked, files } = e.target as any;
    if (type === "checkbox" && name === "type") {
      setForm(f => ({
        ...f,
        type: checked ? [...f.type, value] : f.type.filter((t: string) => t !== value),
      }));
    } else if (type === "checkbox") {
      setForm(f => ({ ...f, [name]: checked }));
    } else if (type === "file") {
      setForm(f => ({ ...f, photo: files[0] }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  }
  async function handleObsSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addDoc(collection(db, "observations"), {
        ...form,
        createdAt: new Date().toISOString(),
        status: form.closedOut === "Yes" ? "CLOSED" : "OPEN",
      });
      alert("Observation submitted!");
      setForm(defaultForm);
      onClose();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to save observation:", err);
      alert("Could not save observation to the database!");
    }
  }

  // UI Styles
  const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    marginBottom: 15
  };
  const labelStyle: React.CSSProperties = {
    marginBottom: 4,
    fontWeight: 500,
    fontSize: 14,
    color: "#313144"
  };
  const inputStyle: React.CSSProperties = {
    border: "1.2px solid #c5c5cd",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 15,
    background: "#fafdff",
    outline: "none"
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 55,
    resize: "vertical"
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
        background: "rgba(0,0,0,0.36)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200
      }}>
      <div style={{
        background: "#fff",
        borderRadius: 18,
        width: "98vw",
        maxWidth: 480,
        boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
        overflowY: "auto",
        maxHeight: "96vh",
        minHeight: 0
      }}>
        {/* Tab Switch */}
        <div style={{ display: "flex", borderBottom: "1px solid #e3e3e3" }}>
          <button
            style={{
              flex: 1, padding: "14px 0", border: "none", background: activeTab === "emergency" ? "#f7dada" : "#fafafa", color: activeTab === "emergency" ? "#b30000" : "#222", fontWeight: 600, fontSize: 17, cursor: "pointer"
            }}
            onClick={() => setActiveTab("emergency")}
          >Emergency</button>
          <button
            style={{
              flex: 1, padding: "14px 0", border: "none", background: activeTab === "observation" ? "#e8f6ff" : "#fafafa", color: activeTab === "observation" ? "#036" : "#222", fontWeight: 600, fontSize: 17, cursor: "pointer"
            }}
            onClick={() => setActiveTab("observation")}
          >Observation Card</button>
        </div>
        {/* Emergency Tab */}
        {activeTab === "emergency" && (
          <form onSubmit={handleEmergencySubmit} style={{ padding: "26px 22px 18px 22px", overflowY: "auto" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 16, color: "#b30000" }}>Emergency Incident Report</h2>
            <div style={fieldStyle}>
              <label style={labelStyle}>Describe the Emergency:</label>
              <textarea
                name="emergencyDesc"
                value={emergencyDesc}
                onChange={e => setEmergencyDesc(e.target.value)}
                required
                placeholder="e.g. Diver unconscious, fire, loss of comms, etc."
                style={textareaStyle}
              />
            </div>
            {match ? (
              <div style={{
                border: "2px solid #f55",
                padding: 16,
                borderRadius: 10,
                background: "#fff4f0",
                marginBottom: 18
              }}>
                <div style={{
                  fontWeight: 700,
                  color: "#b30000",
                  fontSize: 18,
                  marginBottom: 10
                }}>
                  ERP Protocol Identified: <span style={{ color: "#e00" }}>{match.type}</span>
                </div>
                <div style={{
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#222",
                  fontSize: 16
                }}>
                  Notify the following Command Team Members:
                </div>
                <div style={{
                  marginBottom: 12,
                  padding: "8px 0 7px 0",
                  borderRadius: 7,
                  background: "#fff"
                }}>
                  {match.notify.map(role => {
                    const contacts = (teamMembers ?? []).filter(tm => tm.role === role);
                    if (!contacts.length) {
                      return (
                        <div key={role} style={{
                          fontWeight: 700,
                          color: "#d80000",
                          fontSize: 15
                        }}>{role}: No contact found</div>
                      );
                    }
                    return contacts.map(contact => (
                      <div key={role + contact.id} style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 6,
                        gap: 12
                      }}>
                        <span style={{
                          fontWeight: 700,
                          color: role === "GOLD" ? "#d8a100" : "#485057",
                          minWidth: 75
                        }}>{role}:</span>
                        <span style={{
                          fontWeight: 600,
                          color: "#15264e",
                          fontSize: 15
                        }}>{contact.firstName} {contact.lastName}</span>
                        <span style={{
                          color: "#6c7885",
                          fontSize: 13
                        }}>{contact.title}</span>
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            style={{
                              color: "#0074b8",
                              background: "#e4f0fb",
                              borderRadius: 6,
                              padding: "3px 11px",
                              fontWeight: 700,
                              fontSize: 15,
                              textDecoration: "none",
                              marginLeft: 7
                            }}
                            title={`Call ${contact.firstName} ${contact.lastName}`}
                          >
                            {contact.phone}
                          </a>
                        )}
                      </div>
                    ));
                  })}
                </div>
                <div style={{
                  fontWeight: 600,
                  marginTop: 12,
                  marginBottom: 5,
                  color: "#222",
                  fontSize: 15
                }}>
                  Next Steps:
                </div>
                <div style={{
                  color: "#c00",
                  fontWeight: 500,
                  fontSize: 15.5,
                  background: "#fff",
                  borderRadius: 5,
                  padding: 8,
                  lineHeight: 1.6,
                  letterSpacing: 0.1
                }}>
                  {match.protocol}
                </div>
              </div>
            ) : emergencyDesc.length > 5 ? (
              <div style={{
                border: "1px solid #aaa",
                padding: 8,
                borderRadius: 8,
                background: "#f9ecec",
                color: "#b30000",
                marginBottom: 13
              }}>
                <b>No protocol matched.</b> Please double-check, or notify GOLD/SILVER for manual escalation.
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 14, marginTop: 9, justifyContent: "flex-end" }}>
              <button type="submit" style={{ background: "#d80000", color: "#fff", borderRadius: 6, padding: "10px 22px", fontWeight: 600, border: "none", fontSize: 15, cursor: "pointer" }}>Submit Emergency</button>
              <button type="button" onClick={onClose} style={{ background: "#aaa", color: "#fff", borderRadius: 6, padding: "10px 22px", fontWeight: 500, border: "none", fontSize: 15, cursor: "pointer" }}>Cancel</button>
            </div>
          </form>
        )}
        {/* Observation Card Tab */}
        {activeTab === "observation" && (
          <form onSubmit={handleObsSubmit} style={{ padding: "26px 22px 18px 22px", overflowY: "auto" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 16, color: "#036" }}>Hazard Observation Card</h2>
            <div style={{ marginBottom: 13 }}>
              <div style={labelStyle}>Type of Observation:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {incidentTypes.map(type => (
                  <label key={type} style={{ display: "flex", alignItems: "center", fontSize: 14, marginRight: 13 }}>
                    <input
                      type="checkbox"
                      name="type"
                      value={type}
                      checked={form.type.includes(type)}
                      onChange={handleObsChange}
                      style={{ marginRight: 5 }}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Location:</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleObsChange}
                required
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Vessel:</label>
              <input
                type="text"
                name="vessel"
                value={form.vessel}
                onChange={handleObsChange}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>System:</label>
              <input
                type="text"
                name="system"
                value={form.system}
                onChange={handleObsChange}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Client:</label>
              <input
                type="text"
                name="client"
                value={form.client}
                onChange={handleObsChange}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Observation:</label>
              <textarea
                name="observation"
                value={form.observation}
                onChange={handleObsChange}
                required
                style={textareaStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Immediate Corrective Action Taken:</label>
              <textarea
                name="corrective"
                value={form.corrective}
                onChange={handleObsChange}
                style={textareaStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Recommendation from your Observation:</label>
              <textarea
                name="recommendation"
                value={form.recommendation}
                onChange={handleObsChange}
                style={textareaStyle}
              />
            </div>
            <div style={{ ...fieldStyle, flexDirection: "row", alignItems: "center", gap: 17 }}>
              <span style={labelStyle}>Closed Out?</span>
              <label style={{ fontWeight: 400, fontSize: 14 }}>
                <input
                  type="radio"
                  name="closedOut"
                  value="Yes"
                  checked={form.closedOut === "Yes"}
                  onChange={handleObsChange}
                /> Yes
              </label>
              <label style={{ fontWeight: 400, fontSize: 14 }}>
                <input
                  type="radio"
                  name="closedOut"
                  value="No"
                  checked={form.closedOut === "No"}
                  onChange={handleObsChange}
                /> No
              </label>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Name (Optional):</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleObsChange}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Sign:</label>
              <input
                type="text"
                name="sign"
                value={form.sign}
                onChange={handleObsChange}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Date:</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleObsChange}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Attach Photo/Video:</label>
              <input
                type="file"
                accept="image/*,video/*"
                name="photo"
                onChange={handleObsChange}
              />
            </div>
            <div style={{ ...fieldStyle, flexDirection: "row", alignItems: "center", gap: 9 }}>
              <input
                type="checkbox"
                name="stopWork"
                checked={form.stopWork}
                onChange={handleObsChange}
              />
              <span style={{ fontWeight: 500, color: "#b30000" }}>
                I am exercising STOP WORK AUTHORITY for this incident.
              </span>
            </div>
            <div style={{ marginTop: 19, display: "flex", justifyContent: "flex-end", gap: 13 }}>
              <button
                type="submit"
                style={{
                  background: "#0074b8",
                  color: "#fff",
                  padding: "10px 22px",
                  borderRadius: 6,
                  fontWeight: 600,
                  border: "none",
                  fontSize: 15,
                  cursor: "pointer"
                }}
              >
                Submit Observation
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "#aaa",
                  color: "#fff",
                  borderRadius: 6,
                  padding: "10px 22px",
                  fontWeight: 500,
                  border: "none",
                  fontSize: 15,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
            </form>
            )}
            </div>
            </div>
            );
            };

            export default EmergencyModal;