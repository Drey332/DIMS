import React, { useState } from "react";
import { db } from "../firebase"; // or "../firebase.js" if needed
import { collection, addDoc } from "firebase/firestore";


        // --- Command Team Contacts from ERP (HDG-PRJ-HSE-863-01-24) ---
        const commandContacts: Record<string, { name: string; phone: string; role: string }> = {
          GOLD: { name: "Frank Ifedi", phone: "+234-805-789-5678", role: "MD/CEO - Gold Manager" },
          SILVER: { name: "Dave Ward", phone: "+234-803-456-7890", role: "Marine Operations Director - Silver Manager" },
          BRONZE: { name: "Nick Roddy", phone: "+234-802-123-0001", role: "On-Scene Coordinator (OSC) - Bronze Manager" },
          "Onsite Medical": { name: "Lagos University Teaching Hospital", phone: "+234-1-456-7890", role: "Onsite Medical Support" },
          "ROV Operator": { name: "Afam Ejidike", phone: "+234-701-555-0001", role: "ROV Supervisor" },
          COSC: { name: "Shell Rep", phone: "+234-810-555-5555", role: "Client On-Scene Coordinator (COSC)" },
          HSE: { name: "Kene Anyabolu", phone: "+234-809-010-0101", role: "HSE Manager" },
          "Marine Manager": { name: "Steve Hardy", phone: "+234-807-555-1111", role: "Marine Manager" },
          "Hyperbaric Medical": { name: "ISOS Duty Doctor", phone: "+44-20-8762-8008", role: "ISOS Duty Doctor (Diving emergencies)" },
          LOGISTICS: { name: "Temitope Oke", phone: "+234-810-222-3333", role: "Logistics Coordinator" },
          "Communications Lead": { name: "Angela Eze", phone: "+234-701-333-6666", role: "Communications Lead" }
        };

        // --- Emergency keywords/logic ---
        function normalize(str: string) {
          return str
            .toLowerCase()
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        }

        const emergencyKeywords = [
          {
            keywords: ["fire", "firee", "fier", "smoke", "smooke", "burn", "explosion", "explod", "blast", "blaze", "flames", "alarm", "fire alarm"],
            type: "Fire/Evacuation",
            notify: ["GOLD", "SILVER"],
            protocol: "Sound alarm. Stop operations. Evacuate personnel. Isolate oxygen. Use fire extinguisher if safe. Notify GOLD/SILVER."
          },
          {
            keywords: ["unconscious", "no response", "not breathing", "injured", "collapse", "faint", "lifeless", "passed out", "blackout"],
            type: "Diver Unconscious/Injured",
            notify: ["SILVER", "Onsite Medical", "GOLD"],
            protocol: "STOP all moving parts. Deploy standby diver. Recover casualty. Begin first aid/CPR. Notify Medical/SILVER/GOLD."
          },
          {
            keywords: ["loss of comms", "radio lost", "no audio", "no response", "radio fail", "radio down", "lost comms", "communication down"],
            type: "Loss of Communication",
            notify: ["SILVER", "GOLD"],
            protocol: "Stop winches. Try backup comms. Deploy standby diver. Recover diver to surface. Notify SILVER/GOLD."
          },
          {
            keywords: ["loss of air", "compressor", "no gas", "rupture", "low pressure", "no air", "air supply", "air loss", "breathing gas"],
            type: "Loss of Air Supply",
            notify: ["SILVER", "GOLD"],
            protocol: "Switch to emergency air. Recover diver. Check system. Notify SILVER/GOLD."
          },
          {
            keywords: ["trapped", "fouled", "stuck", "entangled", "snagged", "caught", "tangled"],
            type: "Fouled/Trapped Diver",
            notify: ["SILVER", "ROV Operator", "GOLD"],
            protocol: "Stop all vessel/equipment. Deploy ROV. Attempt recovery. Notify SILVER/ROV/GOLD."
          },
          {
            keywords: ["adrift", "surface", "missing", "gone", "lost at sea", "drifting"],
            type: "Diver Adrift",
            notify: ["SILVER", "GOLD"],
            protocol: "Launch rescue craft. Keep diver visual. Notify SILVER/GOLD."
          },
          {
            keywords: ["medical", "injury", "bleeding", "cut", "amputation", "hurt", "wound", "broken", "fracture"],
            type: "Medical Emergency",
            notify: ["Onsite Medical", "GOLD", "SILVER"],
            protocol: "Apply first aid. Notify onsite doctor. Prepare medevac. Notify GOLD/SILVER."
          }
        ];

        function analyzeEmergency(description: string) {
          if (!description) return null;
          const desc = normalize(description);
          for (const scenario of emergencyKeywords) {
            for (const k of scenario.keywords) {
              if (desc.includes(k)) {
                return scenario;
              }
            }
          }
          return null;
        }

        // --- Firestore save helper ---
        async function saveEmergencyReport(data: any) {
          try {
            await addDoc(collection(db, "emergencies"), {
              ...data,
              createdAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error("Failed to save emergency:", err);
            alert("Could not save emergency report to the database!");
          }
        }

        // --- Observation Card Types ---
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
          client: "Shell Petroleum Development Company (SPDC)",
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
          "Near-miss",
        ];

        type EmergencyModalProps = {
          open: boolean;
          onClose: () => void;
        };

        export default function EmergencyModal({ open, onClose }: EmergencyModalProps) {
          const [activeTab, setActiveTab] = useState<"emergency" | "observation">("emergency");
          const [emergencyDesc, setEmergencyDesc] = useState("");
          const match = analyzeEmergency(emergencyDesc);
          const [form, setForm] = useState(defaultForm);

          async function handleEmergencySubmit(e: React.FormEvent) {
            e.preventDefault();
            try {
              if (match) {
                const validContacts = match.notify
                  .filter(role => commandContacts[role])
                  .map(role => ({
                    roleKey: role,
                    ...commandContacts[role]
                  }));

                // --- Always set status and startTime! ---
                await addDoc(collection(db, "emergencies"), {
                  type: match.type,
                  title: match.type, // Optional, for easy display
                  description: emergencyDesc,
                  priority: "CRITICAL",
                  status: "ACTIVE", // Always present!
                  startTime: new Date().toISOString(), // Always present!
                  notifiedContacts: validContacts,
                  createdAt: new Date().toISOString(),
                });
              }
              alert("Emergency report submitted!");
              setEmergencyDesc("");
              onClose();
            } catch (error) {
              console.error("Error in handleEmergencySubmit:", error);
              alert("Critical error occurred. Please check the console for more information.");
            }
          }

          // --- Observation Handlers ---
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
                status: form.closedOut === "Yes" ? "CLOSED" : "OPEN", // add a status field for filtering
              });
              alert("Observation submitted!");
              setForm(defaultForm);
              onClose();
            } catch (err) {
              console.error("Failed to save observation:", err);
              alert("Could not save observation to the database!");
            }
          }

          // --- UI Styles (responsive, clean) ---
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
                          {match.notify.map((role) =>
                            commandContacts[role] ? (
                              <div key={role} style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 6,
                                gap: 12
                              }}>
                                <span style={{
                                  fontWeight: 700,
                                  color: "#d80000",
                                  minWidth: 75,
                                  fontSize: 15,
                                  letterSpacing: 0.5
                                }}>{role}:</span>
                                <span style={{
                                  fontWeight: 600,
                                  color: "#15264e",
                                  fontSize: 15
                                }}>{commandContacts[role].name}</span>
                                <span style={{
                                  color: "#6c7885",
                                  fontSize: 13
                                }}>({commandContacts[role].role})</span>
                                <a
                                  href={`tel:${commandContacts[role].phone}`}
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
                                  title={`Call ${commandContacts[role].name}`}
                                >
                                  {commandContacts[role].phone}
                                </a>
                              </div>
                            ) : (
                              <div key={role} style={{
                                fontWeight: 700,
                                color: "#d80000",
                                fontSize: 15
                              }}>
                                {role}
                              </div>
                            )
                          )}
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
                          <label key={type} style={{ display: "flex", alignItems: "center", fontSize: 14, marginRight: 
                            13 }}>
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
                                          <span style={{ fontWeight: 500, color: "#b30000" }}>I am exercising STOP WORK AUTHORITY for this incident.</span>
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
                                              fontSize: 15
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
                                              fontSize: 15
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
                            }