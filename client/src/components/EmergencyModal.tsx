import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Fuse from "fuse.js";

type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: "GOLD" | "SILVER" | "BRONZE" | string;
  title?: string;
  phone?: string;
};

type ERPProtocol = {
  id?: string;
  keywords: string;
  type: string;
  notify: string[] | string;
  protocol: string;
};

type EmergencyModalProps = {
  open: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  projectId?: string;
};

const defaultForm = {
  type: [] as string[],
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
  photo: null as File | null,
};

const incidentTypes = [
  "Unsafe Act",
  "Unsafe Condition",
  "Unsafe Procedure",
  "Safe Act/Good Practice",
  "Safe Condition",
  "Near-miss",
];

function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function showEmergencyNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/alert-icon.png" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, { body, icon: "/alert-icon.png" });
      }
    });
  }
}

const EmergencyModal: React.FC<EmergencyModalProps> = ({
  open,
  onClose,
  teamMembers,
  projectId = "1", // Default project ID
}) => {
  const auth = getAuth();
  const user = auth.currentUser;
  const activeProject = { id: projectId };

  // --- Tabs & Form States ---
  const [activeTab, setActiveTab] = useState<"emergency" | "nearMiss" | "observation">("emergency");
  const [form, setForm] = useState<typeof defaultForm>(defaultForm);

  // Near Miss
  const [nearMiss, setNearMiss] = useState<{
    observation: string;
    location: string;
    recommendation: string;
    reporter: string;
  }>({
    observation: "",
    location: "",
    recommendation: "",
    reporter: "",
  });
  const [nearMissSent, setNearMissSent] = useState(false);

  // Protocols
  const [erpProtocols, setErpProtocols] = useState<ERPProtocol[]>([]);
  const [fuse, setFuse] = useState<Fuse<any> | null>(null);
  const [emergencyDesc, setEmergencyDesc] = useState("");
  const [match, setMatch] = useState<(ERPProtocol & { matchedKeyword?: string }) | null>(null);

  // --- Location for Obs/Near Miss ---
  const [location, setLocation] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');

  // Emergency Alarm State
  const [alarmOpen, setAlarmOpen] = useState(false);
  const [newIncidentId, setNewIncidentId] = useState<string | null>(null);

  // --- Location Util ---
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setLocationStatus('error');
      return;
    }
    setLocationStatus('fetching');
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('success');
      },
      (error) => {
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) errorMsg = "Location access denied. Location will not be recorded.";
        else if (error.code === error.POSITION_UNAVAILABLE) errorMsg = "Location information is unavailable.";
        else if (error.code === error.TIMEOUT) errorMsg = "The request to get user location timed out.";
        setLocationError(errorMsg);
        setLocationStatus('error');
        setLocation({ lat: null, lng: null });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };
  const resetLocationState = () => {
    setLocation({ lat: null, lng: null });
    setLocationStatus('idle');
    setLocationError(null);
  };

  // --- Protocol Fetch ---
  useEffect(() => {
    if (!open) return;
    getDocs(collection(db, "projects", projectId, "erpProtocols")).then((snapshot) => {
      const erps = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as ERPProtocol));
      setErpProtocols(erps);
      const fuseData = erps.flatMap((scenario) =>
        (scenario.keywords || "").split(",").map((k) => ({
          keyword: normalize(k),
          ...scenario,
        }))
      );
      setFuse(new Fuse(fuseData, { keys: ["keyword"], threshold: 0.34, includeScore: true }));
    });
  }, [open, projectId]);

  // --- ERP Protocol Matching ---
  useEffect(() => {
    if (!emergencyDesc || !fuse) {
      setMatch(null);
      return;
    }
    const desc = normalize(emergencyDesc);
    for (const scenario of erpProtocols) {
      const keys = (scenario.keywords || "").split(",").map(normalize);
      for (const k of keys) {
        if (desc.includes(k)) {
          setMatch({ ...scenario, matchedKeyword: k });
          return;
        }
      }
    }
    const results = fuse.search(desc);
    if (results.length > 0) {
      setMatch({
        ...results[0].item,
        matchedKeyword: results[0].item.keyword,
      });
    } else {
      setMatch(null);
    }
  }, [emergencyDesc, fuse, erpProtocols]);

  // --- Location Auto-request (Obs/Near Miss) ---
  useEffect(() => {
    if (!open) return;
    if (activeTab === "observation" || activeTab === "nearMiss") {
      if (locationStatus === 'idle' || locationStatus === 'error') getCurrentLocation();
    }
    // eslint-disable-next-line
  }, [activeTab, open]);

  // --- Reset on Modal Close ---
  useEffect(() => {
    if (!open) {
      setAlarmOpen(false);
      setNewIncidentId(null);
      setEmergencyDesc("");
      setMatch(null);
      setNearMissSent(false);
      resetLocationState();
      setForm(defaultForm);
      setNearMiss({ observation: "", location: "", recommendation: "", reporter: "" });
    }
  }, [open]);

  // --- Emergency Handler ---
  async function handleEmergencySubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let notifiedContacts: any[] = [];
      const notifyRoles = Array.isArray(match?.notify)
        ? match?.notify
        : match?.notify
        ? [match?.notify]
        : [];
      if (match) {
        notifiedContacts = notifyRoles.flatMap((role) =>
          (teamMembers ?? [])
            .filter((tm) => tm.role.trim().toUpperCase() === role.trim().toUpperCase())
            .map((tm) => ({
              roleKey: role,
              name: tm.firstName + " " + tm.lastName,
              phone: tm.phone,
              title: tm.title,
            }))
        );
      }
      const docRef = await addDoc(collection(db, "emergencies"), {
        type: match?.type || "Other",
        title: match?.type || emergencyDesc,
        description: emergencyDesc,
        priority: "CRITICAL",
        status: "ACTIVE",
        startTime: new Date().toISOString(),
        notifiedContacts,
        createdAt: new Date().toISOString(),
        initiatedBy: user?.uid || "anonymous",
        initiatorName: user?.displayName || user?.email || "Unknown User",
        initiatorEmail: user?.email || "",
        projectId: activeProject?.id || "default",
      });
      setNewIncidentId(docRef.id);
      setAlarmOpen(true);
      showEmergencyNotification(
        "🚨 Muster Protocol Activated",
        "A muster alarm was triggered. Please acknowledge presence ASAP."
      );
    } catch (error) {
      alert("Critical error occurred. Please check the console for more information.");
      // eslint-disable-next-line no-console
      console.error("Error in handleEmergencySubmit:", error);
    }
  }

  // --- Near Miss Handler ---
  async function handleNearMissSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      await addDoc(collection(db, "observations"), {
        type: ["Near-miss"],
        observation: nearMiss.observation,
        location: nearMiss.location,
        recommendation: nearMiss.recommendation,
        reporter: nearMiss.reporter || user?.displayName || user?.email || "Anonymous",
        submittedBy: user?.uid || "anonymous",
        submitterName: user?.displayName || user?.email || "Unknown User",
        submitterEmail: user?.email || "",
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().substring(0, 10),
        status: "NEAR_MISS",
        lat: location.lat,
        lng: location.lng,
        projectId: activeProject?.id || "default",
      });
      setNearMissSent(true);
      setNearMiss({ observation: "", location: "", recommendation: "", reporter: "" });
      
      // Auto-exit after successful submission
      setTimeout(() => {
        setNearMissSent(false);
        onClose(); // Close modal and return to dashboard
      }, 1500);
    } catch (err) {
      alert("Failed to save near miss. Please try again.");
      console.error("Failed to save near miss:", err);
    }
  }

  // --- Observation Handler ---
  function handleObsChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    if (type === "checkbox" && name === "type") {
      const checked = (target as HTMLInputElement).checked;
      setForm((f) => ({
        ...f,
        type: checked ? [...f.type, value] : f.type.filter((t: string) => t !== value),
      }));
    } else if (type === "checkbox") {
      const checked = (target as HTMLInputElement).checked;
      setForm((f) => ({ ...f, [name]: checked }));
    } else if (type === "file") {
      const files = (target as HTMLInputElement).files;
      setForm((f) => ({ ...f, photo: files?.[0] || null }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }
  async function handleObsSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const observationData = {
        ...form,
        lat: location.lat,
        lng: location.lng,
        createdAt: new Date().toISOString(),
        status: form.closedOut === "Yes" ? "CLOSED" : "OPEN",
        projectId: activeProject?.id || "default",
      };
      await addDoc(collection(db, "observations"), observationData);
      alert("Observation submitted!");
      setForm(defaultForm);
      resetLocationState();
      onClose();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to save observation:", err);
      alert("Could not save observation to the database!");
    }
  }

  // --- Styles ---
  const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    marginBottom: 15,
  };
  const labelStyle: React.CSSProperties = {
    marginBottom: 4,
    fontWeight: 500,
    fontSize: 14,
    color: "#313144",
  };
  const inputStyle: React.CSSProperties = {
    border: "1.2px solid #c5c5cd",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 15,
    background: "#fafdff",
    outline: "none",
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 55,
    resize: "vertical",
  };

  if (!open) return null;
  const notifyRoles =
    Array.isArray(match?.notify)
      ? match.notify
      : match?.notify
      ? [match.notify]
      : [];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.36)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
      }}
    >
      {/* --- Emergency Alarm Modal Placeholder (Assuming it exists) --- */}
      {alarmOpen && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1300, padding: 20, background: 'white', borderRadius: 10 }}>
          <p>Emergency Alarm Modal would be here. Incident ID: {newIncidentId}</p>
          <button onClick={() => { setAlarmOpen(false); setNewIncidentId(null); onClose(); }}>Acknowledge</button>
        </div>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "98vw",
          maxWidth: 480,
          boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
          overflowY: "auto",
          maxHeight: "96vh",
          minHeight: 0,
          filter: alarmOpen ? "blur(1.5px)" : undefined,
          pointerEvents: alarmOpen ? "none" : undefined,
        }}
      >
        {/* --- Tab Switches --- */}
        <div style={{ display: "flex", borderBottom: "1px solid #e3e3e3" }}>
          <button
            style={{
              flex: 1,
              padding: "14px 0",
              border: "none",
              background: activeTab === "emergency" ? "#f7dada" : "#fafafa",
              color: activeTab === "emergency" ? "#b30000" : "#222",
              fontWeight: 600,
              fontSize: 17,
              cursor: alarmOpen ? "not-allowed" : "pointer",
            }}
            onClick={() => !alarmOpen && setActiveTab("emergency")}
            disabled={alarmOpen}
          >
            Emergency
          </button>
          <button
            style={{
              flex: 1,
              padding: "14px 0",
              border: "none",
              background: activeTab === "nearMiss" ? "#fff9c4" : "#fafafa",
              color: activeTab === "nearMiss" ? "#b59f05" : "#7a7215",
              fontWeight: 600,
              fontSize: 17,
              cursor: alarmOpen ? "not-allowed" : "pointer",
            }}
            onClick={() => !alarmOpen && setActiveTab("nearMiss")}
            disabled={alarmOpen}
          >
            Near Miss
          </button>
          <button
            style={{
              flex: 1,
              padding: "14px 0",
              border: "none",
              background: activeTab === "observation" ? "#e8f6ff" : "#fafafa",
              color: activeTab === "observation" ? "#036" : "#222",
              fontWeight: 600,
              fontSize: 17,
              cursor: alarmOpen ? "not-allowed" : "pointer",
            }}
            onClick={() => !alarmOpen && setActiveTab("observation")}
            disabled={alarmOpen}
          >
            Observation Card
          </button>
        </div>

        {/* --- Emergency Tab --- */}
        {activeTab === "emergency" && (
          <form onSubmit={handleEmergencySubmit} style={{ padding: "26px 22px 18px 22px", overflowY: "auto" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 16, color: "#b30000" }}>Emergency Incident Report</h2>
            <div style={fieldStyle}>
              <label style={labelStyle}>Describe the Emergency:</label>
              <textarea
                name="emergencyDesc"
                value={emergencyDesc}
                onChange={(e) => setEmergencyDesc(e.target.value)}
                required
                placeholder="e.g. Diver unconscious, fire, loss of comms, etc."
                style={textareaStyle}
                disabled={alarmOpen}
              />
            </div>
            {match ? (
              <div style={{
                border: "2px solid #f55",
                padding: 16,
                borderRadius: 10,
                background: "#fff4f0",
                marginBottom: 18,
              }}>
                <div style={{
                  fontWeight: 700,
                  color: "#b30000",
                  fontSize: 18,
                  marginBottom: 10,
                }}>
                  ERP Protocol Identified: <span style={{ color: "#e00" }}>{match.type}</span>
                </div>
                <div style={{
                  fontWeight: 600,
                  marginBottom: 8,
                    color: "#222",
                    fontSize: 16,
                    }}>
                    Notify the following Command Team Members:
                    </div>
                    <div
                    style={{
                      marginBottom: 12,
                      padding: "8px 0 7px 0",
                      borderRadius: 7,
                      background: "#fff",
                    }}
                    >
                    {notifyRoles.map((role) => {
                      const contacts = (teamMembers ?? []).filter((tm) => tm.role === role);
                      if (!contacts.length) {
                        return (
                          <div
                            key={role}
                            style={{
                              fontWeight: 700,
                              color: "#d80000",
                              fontSize: 15,
                            }}
                          >
                            {role}: No contact found
                          </div>
                        );
                      }
                      return contacts.map((contact) => (
                        <div
                          key={role + contact.id}
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 6,
                            gap: 12,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: role === "GOLD" ? "#d8a100" : "#485057",
                              minWidth: 75,
                            }}
                          >
                            {role}:
                          </span>
                          <span
                            style={{
                              fontWeight: 600,
                              color: "#15264e",
                              fontSize: 15,
                            }}
                          >
                            {contact.firstName} {contact.lastName}
                          </span>
                          <span
                            style={{
                              color: "#6c7885",
                              fontSize: 13,
                            }}
                          >
                            {contact.title}
                          </span>
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
                                marginLeft: 7,
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
                    <div
                    style={{
                      fontWeight: 600,
                      marginTop: 12,
                      marginBottom: 5,
                      color: "#222",
                      fontSize: 15,
                    }}
                    >
                    Next Steps:
                    </div>
                    <ol style={{ margin: 0, padding: 0, listStyle: "none", marginTop: 6 }}>
                    {(match.protocol || "")
                      .split(/\s*\d+\.\s+/)
                      .filter(Boolean)
                      .map((step, idx) => (
                        <li
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 14,
                            background: "#fff",
                            borderLeft: "5px solid #d80000",
                            boxShadow: "0 2px 9px 0 rgba(218,55,55,0.08)",
                            borderRadius: 10,
                            marginBottom: 12,
                            padding: "12px 15px",
                          }}
                        >
                          <span
                            style={{
                              minWidth: 33,
                              minHeight: 33,
                              background: "#d80000",
                              color: "#fff",
                              fontWeight: 800,
                              borderRadius: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 17,
                              boxShadow: "0 2px 8px 0 #d8000020",
                              marginTop: 2,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span
                            style={{
                              fontSize: 15.5,
                              color: "#21244a",
                              fontWeight: 600,
                              lineHeight: 1.62,
                            }}
                          >
                            {step.trim()}
                          </span>
                        </li>
                      ))}
                    </ol>
                    </div>
                    ) : emergencyDesc.length > 5 ? (
                    <div
                    style={{
                    border: "1px solid #aaa",
                    padding: 8,
                    borderRadius: 8,
                    background: "#f9ecec",
                    color: "#b30000",
                    marginBottom: 13,
                    }}
                    >
                    <b>No protocol matched.</b> Please double-check, or notify GOLD/SILVER for manual escalation.
                    </div>
                    ) : null}
                    <div
                    style={{
                    display: "flex",
                    gap: 14,
                    marginTop: 9,
                    justifyContent: "flex-end",
                    }}
                    >
                    <button
                    type="submit"
                    style={{
                    background: "#d80000",
                    color: "#fff",
                    borderRadius: 6,
                    padding: "10px 22px",
                    fontWeight: 600,
                    border: "none",
                    fontSize: 15,
                    cursor: alarmOpen ? "not-allowed" : "pointer",
                    }}
                    disabled={alarmOpen}
                    >
                    Submit Emergency
                    </button>
                    <button
                    type="button"
                    onClick={() => {
                    onClose();
                    setAlarmOpen(false);
                    setNewIncidentId(null);
                    resetLocationState();
                    }}
                    style={{
                    background: "#aaa",
                    color: "#fff",
                    borderRadius: 6,
                    padding: "10px 22px",
                    fontWeight: 500,
                    border: "none",
                    fontSize: 15,
                    cursor: "pointer",
                    }}
                    disabled={alarmOpen}
                    >
                    Cancel
                    </button>
                    </div>
                    </form>
                    )}

                    {/* ----------- NEAR MISS TAB ----------- */}
                    {activeTab === "nearMiss" && (
                    <form onSubmit={handleNearMissSubmit} style={{ background: "#fffde7", padding: "26px 22px 18px 22px", overflowY: "auto", position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setActiveTab("emergency");
                      }}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "15px",
                        background: "transparent",
                        border: "none",
                        fontSize: "18px",
                        color: "#b59f05",
                        cursor: "pointer",
                        fontWeight: "bold"
                      }}
                    >
                      ×
                    </button>
                    <h2 style={{ fontWeight: 700, marginBottom: 16, color: "#b59f05" }}>
                    Near Miss Report
                    </h2>
                    <div style={fieldStyle}>
                    <label style={labelStyle}>Describe the Near Miss:</label>
                    <textarea
                    name="observation"
                    value={nearMiss.observation}
                    onChange={e => setNearMiss(nm => ({ ...nm, observation: e.target.value }))}
                    required
                    placeholder="Describe what almost happened. (e.g. Dropped object, close call, gas leak, etc.)"
                    style={{ ...textareaStyle, background: "#fffde7", border: "1.5px solid #ffe082" }}
                    disabled={nearMissSent}
                    />
                    </div>
                    <div style={fieldStyle}>
                    <label style={labelStyle}>Location:</label>
                    <input
                    type="text"
                    name="location"
                    value={nearMiss.location}
                    onChange={e => setNearMiss(nm => ({ ...nm, location: e.target.value }))}
                    required
                    style={{ ...inputStyle, background: "#fffde7", border: "1.5px solid #ffe082" }}
                    placeholder="Where did it happen? (e.g., Deck 2, Workshop...)"
                    disabled={nearMissSent}
                    />
                    </div>
                    <div style={fieldStyle}>
                    <label style={labelStyle}>Recommendation:</label>
                    <textarea
                    name="recommendation"
                    value={nearMiss.recommendation}
                    onChange={e => setNearMiss(nm => ({ ...nm, recommendation: e.target.value }))}
                    style={{ ...textareaStyle, background: "#fffde7", border: "1.5px solid #ffe082" }}
                    placeholder="Suggest an action to prevent recurrence (optional)."
                    disabled={nearMissSent}
                    />
                    </div>
                    <div style={fieldStyle}>
                    <label style={labelStyle}>Your Name (Optional):</label>
                    <input
                    type="text"
                    name="reporter"
                    value={nearMiss.reporter}
                    onChange={e => setNearMiss(nm => ({ ...nm, reporter: e.target.value }))}
                    style={{ ...inputStyle, background: "#fffde7", border: "1.5px solid #ffe082" }}
                    disabled={nearMissSent}
                    />
                    </div>
                    {/* Location feedback */}
                    <div style={{ marginBottom: 15, padding: '10px', borderRadius: '6px', fontSize: '14px' }}>
                    {locationStatus === 'fetching' && (
                    <div style={{ color: '#b59f05', display: 'flex', alignItems: 'center' }}>
                    <div className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px', border: '2px solid #f3f3f3', borderTop: '2px solid #ffe082', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Detecting your location...
                    </div>
                    )}
                    {locationStatus === 'success' && (
                    <div style={{ color: '#7ca100', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', marginRight: '8px' }}>✓</span>
                    Location captured successfully.
                    </div>
                    )}
                    {locationStatus === 'error' && locationError && (
                    <div style={{ color: '#c49000', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', marginRight: '8px' }}>⚠️</span>
                    {locationError}
                    </div>
                    )}
                    </div>
                    {nearMissSent && (
                    <div style={{ color: "#fff", background: "#b59f05", padding: 10, borderRadius: 9, marginBottom: 10 }}>
                    Near Miss Submitted!
                    </div>
                    )}
                    <div style={{ marginTop: 19, display: "flex", justifyContent: "flex-end", gap: 13 }}>
                    <button
                    type="submit"
                    style={{
                    background: "#ffeb3b",
                    color: "#333",
                    padding: "10px 22px",
                    borderRadius: 6,
                    fontWeight: 700,
                    border: "none",
                    fontSize: 15,
                    cursor: nearMissSent ? "not-allowed" : "pointer",
                    }}
                    disabled={nearMissSent}
                    >
                    Submit Near Miss
                    </button>
                    <button
                    type="button"
                    onClick={() => {
                    onClose();
                    setNearMissSent(false);
                    setNearMiss({ observation: "", location: "", recommendation: "", reporter: "" });
                    resetLocationState();
                    }}
                    style={{
                    background: "#aaa",
                    color: "#fff",
                    borderRadius: 6,
                    padding: "10px 22px",
                    fontWeight: 500,
                    border: "none",
                    fontSize: 15,
                    cursor: "pointer",
                    }}
                    disabled={nearMissSent}
                    >
                    Cancel
                    </button>
                    </div>
                    </form>
                    )}

                    {/* ----------- OBSERVATION CARD TAB ----------- */}
                    {activeTab === "observation" && (
                    <form
                    onSubmit={handleObsSubmit}
                    style={{ padding: "26px 22px 18px 22px", overflowY: "auto" }}
                    >
                    <h2 style={{ fontWeight: 700, marginBottom: 16, color: "#036" }}>
                    Hazard Observation Card
                    </h2>
                    {/* Location Status Feedback */}
                    <div style={{ marginBottom: 15, padding: '10px', borderRadius: '6px', fontSize: '14px' }}>
                    {locationStatus === 'fetching' && (
                    <div style={{ color: '#0074b8', display: 'flex', alignItems: 'center' }}>
                    <div className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px', border: '2px solid #f3f3f3', borderTop: '2px solid #0074b8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Detecting your location...
                    </div>
                    )}
                    {locationStatus === 'success' && (
                    <div style={{ color: '#28a745', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', marginRight: '8px' }}>✓</span>
                    Location captured successfully.
                    </div>
                    )}
                    {locationStatus === 'error' && locationError && (
                    <div style={{ color: '#dc3545', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', marginRight: '8px' }}>⚠️</span>
                    {locationError}
                    </div>
                    )}
                    </div>
                    <div style={{ marginBottom: 13 }}>
                    <div style={labelStyle}>Type of Observation:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {incidentTypes.map((type) => (
                    <label
                      key={type}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 14,
                        marginRight: 13,
                      }}
                    >
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
                    <label style={labelStyle}>
                    Location:
                    {locationStatus === 'success' && (
                    <span style={{ color: '#28a745', marginLeft: '8px', fontSize: '12px' }}>(Captured)</span>
                    )}
                    {locationStatus === 'error' && (
                    <span style={{ color: '#dc3545', marginLeft: '8px', fontSize: '12px' }}>(Error)</span>
                    )}
                    {locationStatus === 'fetching' && (
                    <span style={{ color: '#0074b8', marginLeft: '8px', fontSize: '12px' }}>(Detecting...)</span>
                    )}
                    </label>
                    <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleObsChange}
                    required
                    style={inputStyle}
                    placeholder="Describe the location (e.g., Deck 5, Near Crane 3)"
                    />
                    {locationError && locationStatus === 'error' && (
                    <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '4px' }}>{locationError}</div>
                    )}
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
                    <label style={labelStyle}>Recommendation from your Observation:</label>
                    <textarea
                    name="recommendation"
                    value={form.recommendation}
                    onChange={handleObsChange}
                    style={textareaStyle}
                    />
                    </div>
                    <div
                    style={{
                    ...fieldStyle,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 17,
                    }}
                    >
                    <span style={labelStyle}>Closed Out?</span>
                    <label style={{ fontWeight: 400, fontSize: 14 }}>
                    <input
                    type="radio"
                    name="closedOut"
                    value="Yes"
                    checked={form.closedOut === "Yes"}
                    onChange={handleObsChange}
                    />{" "}
                    Yes
                    </label>
                    <label style={{ fontWeight: 400, fontSize: 14 }}>
                    <input
                    type="radio"
                    name="closedOut"
                    value="No"
                    checked={form.closedOut === "No"}
                    onChange={handleObsChange}
                    />{" "}
                    No
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
                    <div
                    style={{
                    ...fieldStyle,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 9,
                      }}
                      >
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
                      <div
                      style={{
                      marginTop: 19,
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 13,
                      }}
                      >
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
                        cursor: "pointer",
                      }}
                      disabled={alarmOpen}
                      >
                      Submit Observation
                      </button>
                      <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setAlarmOpen(false);
                        resetLocationState();
                      }}
                      style={{
                        background: "#aaa",
                        color: "#fff",
                        borderRadius: 6,
                        padding: "10px 22px",
                        fontWeight: 500,
                        border: "none",
                        fontSize: 15,
                        cursor: "pointer",
                      }}
                      disabled={alarmOpen}
                      >
                      Cancel
                      </button>
                      </div>
                      </form>
                      )}
                      </div>
                      {/* Simple CSS for spinner */}
                      <style>{`
                      @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                      }
                      .spinner {
                      animation: spin 1s linear infinite;
                      }
                      `}</style>
                      </div>
                      );
                      };

                      export default EmergencyModal;