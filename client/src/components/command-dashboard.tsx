import React, { useState, useEffect } from "react";
import EmergencyModal from "./EmergencyModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Bell, Eye, Lock, X, Clock10, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  onSnapshot
} from "firebase/firestore";
import TeamHeadcountMap from "./TeamHeadcountMap";

type Incident = {
  id: string;
  status: string;
  priority: string;
  title: string;
  startTime: string;
  description?: string;
};

type Observation = {
  id: string;
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
  createdAt: string;
  status: string;
};

type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: "GOLD" | "SILVER" | "BRONZE";
  title?: string;
  status?: string;
  avatarUrl?: string;
  activityStatus?: "ONLINE" | "IDLE" | "OFFLINE";
  isGoldCodeHolder?: boolean;
};

type Ack = {
  id: string;
  userId: string;
  name: string;
  lat: number | null;
  lng: number | null;
  avatarUrl?: string | null;
  email?: string | null;
  acknowledgedAt?: string | null;
  role?: string | null;
  locationError?: string | null;
  hasLocation: boolean;
  time?: number; // ms (legacy support)
};

export function CommandDashboard() {
  // --- MODAL, FILTERS, AND STATE ---
  const [showModal, setShowModal] = useState(false);
  const [incidentView, setIncidentView] = useState<'ACTIVE' | 'CLOSED' | 'ALL'>('ACTIVE');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [obsView, setObsView] = useState<'OPEN' | 'CLOSED' | 'ALL'>('OPEN');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [obsLoading, setObsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [acks, setAcks] = useState<Ack[]>([]);
  const [escalateObsId, setEscalateObsId] = useState<string | null>(null);
  const [escalateIncidentId, setEscalateIncidentId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [viewIncident, setViewIncident] = useState<Incident | null>(null);
  const [viewObservation, setViewObservation] = useState<Observation | null>(null);

  // --- TEAM LIVE LISTENER ---
  useEffect(() => {
    // Listen to all team members for this project
    const q = collection(db, "projects", "hydrosafe-5d245", "teamMembers");
    const unsub = onSnapshot(q, snap => {
      setTeamMembers(
        snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeamMember[]
      );
    });
    return unsub;
  }, []);

  // --- INCIDENTS (EMERGENCIES) ---
  useEffect(() => {
    async function fetchIncidents() {
      setLoading(true);
      let q;
      if (incidentView === "ALL") {
        q = query(collection(db, "emergencies"), orderBy("startTime", "desc"));
      } else {
        q = query(
          collection(db, "emergencies"),
          where("status", "==", incidentView),
          orderBy("startTime", "desc")
        );
      }
      const snapshot = await getDocs(q);
      setIncidents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident)));
      setLoading(false);
    }
    fetchIncidents();
  }, [incidentView, showModal]);

  // --- OBSERVATIONS ---
  useEffect(() => {
    async function fetchObservations() {
      setObsLoading(true);
      let q;
      if (obsView === "ALL") {
        q = query(collection(db, "observations"), orderBy("createdAt", "desc"));
      } else {
        q = query(
          collection(db, "observations"),
          where("status", "==", obsView),
          orderBy("createdAt", "desc")
        );
      }
      const snapshot = await getDocs(q);
      setObservations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Observation)));
      setObsLoading(false);
    }
    fetchObservations();
  }, [obsView, showModal]);

  // --- ACKNOWLEDGMENTS: HEADCOUNT FOR LATEST INCIDENT ---
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  useEffect(() => {
    if (!incidents.length) {
      setAcks([]);
      setActiveIncident(null);
      return;
    }
    // Always track the most recent active incident for muster
    const inc = incidents.find(inc => inc.status === "ACTIVE") || incidents[0];
    setActiveIncident(inc);

    let unsub: (() => void) | undefined;
    if (inc) {
      unsub = onSnapshot(
        collection(db, "emergencies", inc.id, "acks"),
        (snap) => {
          const processedAcks = snap.docs.map(doc => {
            const data = doc.data();
            let lat: number | null = typeof data.lat === "number" ? data.lat : null;
            let lng: number | null = typeof data.lng === "number" ? data.lng : null;
            if ((lat === null || lng === null) && data.gps) {
              if (typeof data.gps.lat === "number" && typeof data.gps.lng === "number") {
                lat = data.gps.lat;
                lng = data.gps.lng;
              } else if (typeof data.gps.latitude === "number" && typeof data.gps.longitude === "number") {
                lat = data.gps.latitude;
                lng = data.gps.longitude;
              }
            }
            const hasLocation = typeof lat === "number" && typeof lng === "number";
            return {
              id: doc.id,
              userId: data.userId || doc.id,
              name: data.name || data.displayName || data.gps?.name || "Unknown User",
              avatarUrl: data.avatarUrl || data.photoURL || data.gps?.photoURL || null,
              email: data.email || null,
              lat,
              lng,
              acknowledgedAt: data.acknowledgedAt
                || (data.time ? new Date(data.time).toISOString() : null)
                || data.timestamp || null,
              role: data.role || data.gps?.role || null,
              locationError: data.locationError || null,
              hasLocation,
              time: data.time || null,
            } as Ack;
          });
          setAcks(processedAcks);
        }
      );
    }
    return () => { if (unsub) unsub(); };
  }, [incidents]);

  // --- Helper Functions ---
  const getObsStatusColor = (status: string) =>
    status === "OPEN" ? "bg-yellow-200 text-yellow-900"
      : status === "CLOSED" ? "bg-green-200 text-green-800"
        : "bg-gray-200 text-gray-800";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'priority-critical border border-red-500 shadow-lg';
      case 'HIGH': return 'priority-high border border-orange-500 shadow';
      case 'MEDIUM': return 'priority-medium border border-yellow-400';
      case 'LOW': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  // --- Escalate/Close Handler ---
  function showToast(msg: string, success = true) {
    const el = document.createElement("div");
    el.innerText = msg;
    el.style.position = "fixed";
    el.style.bottom = "24px";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.background = success ? "#16a34a" : "#be123c";
    el.style.color = "#fff";
    el.style.fontWeight = "bold";
    el.style.fontSize = "16px";
    el.style.padding = "12px 28px";
    el.style.borderRadius = "10px";
    el.style.boxShadow = "0 4px 20px #0002";
    el.style.zIndex = "9999";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  const handleEscalateConfirm = async () => {
    if (codeInput === "000") {
      try {
        if (escalateObsId) {
          await updateDoc(doc(db, "observations", escalateObsId), { status: "CLOSED" });
          showToast("Observation closed!");
          setObsView("CLOSED");
        }
        if (escalateIncidentId) {
          await updateDoc(doc(db, "emergencies", escalateIncidentId), { status: "CLOSED" });
          showToast("Incident closed!");
          setIncidentView("CLOSED");
        }
      } catch {
        showToast("Error closing item", false);
      }
      setEscalateObsId(null);
      setEscalateIncidentId(null);
      setCodeInput("");
    } else {
      showToast("Incorrect code", false);
      setCodeInput("");
    }
  };

  // --- Jarvis-level Dashboard: Layout ---
  return (
    <div className="px-3 pb-8 max-w-[1440px] mx-auto">
      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div>
          <div className="flex gap-2 mb-1">
            <Button onClick={() => setIncidentView("ACTIVE")} variant={incidentView === "ACTIVE" ? "default" : "outline"}>Active</Button>
            <Button onClick={() => setIncidentView("CLOSED")} variant={incidentView === "CLOSED" ? "default" : "outline"}>Closed</Button>
            <Button onClick={() => setIncidentView("ALL")} variant={incidentView === "ALL" ? "default" : "outline"}>All</Button>
            <span className="ml-3 font-semibold text-gray-700 text-lg">Emergencies</span>
          </div>
        </div>
        <div>
          <div className="flex gap-2 mb-1">
            <Button onClick={() => setObsView("OPEN")} variant={obsView === "OPEN" ? "default" : "outline"}>Open</Button>
            <Button onClick={() => setObsView("CLOSED")} variant={obsView === "CLOSED" ? "default" : "outline"}>Closed</Button>
            <Button onClick={() => setObsView("ALL")} variant={obsView === "ALL" ? "default" : "outline"}>All</Button>
            <span className="ml-3 font-semibold text-gray-700 text-lg">Observation Cards</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-7 mb-8">
        {/* --- Emergencies and Observations: Main Section --- */}
        <div className="xl:col-span-2 space-y-8">
          {/* --- Emergencies --- */}
          <Card className="hydro-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-2xl font-bold text-hydro-dark flex items-center gap-2">
                <AlertTriangle className="text-orange-500" />
                {incidentView === "ACTIVE"
                  ? "Active Incidents & Operations"
                  : incidentView === "CLOSED"
                  ? "Closed/Resolved Incidents"
                  : "All Emergency Incidents"}
              </CardTitle>
              <Button className="hydro-button-emergency" onClick={() => setShowModal(true)}>
                <Bell className="w-4 h-4 mr-2" />
                New Emergency
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : incidents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center px-6 py-3 rounded-full bg-green-50 text-green-800 font-medium">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      No incidents at this time
                    </div>
                  </div>
                ) : (
                  incidents.map((incident, idx) => (
                    <div key={incident.id} className={cn("rounded-xl p-5 border relative bg-white", getPriorityColor(incident.priority))}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-4 h-4 rounded-full",
                            incident.priority === 'CRITICAL' ? 'bg-red-500 animate-pulse' :
                              incident.priority === 'HIGH' ? 'bg-orange-500 animate-pulse-slow' :
                                'bg-yellow-500'
                          )}></div>
                          <h4 className="font-bold">{incident.title}</h4>
                        </div>
                        <Badge variant="outline" className="font-medium uppercase tracking-wide">{incident.priority} Priority</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <Clock10 className="inline-block w-4 h-4 mr-1 -mt-1" />
                          Started: <span>{incident.startTime ? new Date(incident.startTime).toLocaleString() : "-"}</span>
                        </div>
                        <div>Status: <span className="font-bold">{incident.status}</span></div>
                      </div>
                      {incident.description && (
                        <div className="mb-2 text-gray-700">{incident.description}</div>
                      )}
                      <div className="mt-1 flex space-x-2">
                        <Button size="sm" variant="outline" className="bg-orange-600 text-white hover:bg-orange-700"
                          onClick={() => setViewIncident(incident)}>
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Button>
                        <Button size="sm" variant="outline" className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                          onClick={() => {
                            setEscalateIncidentId(incident.id);
                            setEscalateObsId(null);
                            setCodeInput("");
                          }}>
                          <Lock className="w-3 h-3 mr-1" /> Archive
                        </Button>
                      </div>
                      {/* World-class Analytics: Who hasn’t acknowledged? */}
                      {idx === 0 && activeIncident && (
                        <div className="absolute top-2 right-2 text-xs text-red-600 font-bold uppercase">
                          {acks.length} / {teamMembers.length} Mustered
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* --- Observations --- */}
          <Card className="hydro-card mt-6">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-hydro-dark flex items-center">
                <Eye className="text-blue-500 mr-3 h-5 w-5" />
                {obsView === "OPEN"
                  ? "Open Observations"
                  : obsView === "CLOSED"
                  ? "Closed Observations"
                  : "All Observations"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {obsLoading ? (
                  <div className="text-center py-8">Loading observations...</div>
                ) : observations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No observations found.</div>
                ) : (
                  observations.map((obs) => (
                    <div key={obs.id} className="rounded-xl p-5 border bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-semibold text-blue-700">                {obs.type.join(", ")}</span>
                              <span className="ml-2 text-sm text-gray-600">{obs.location}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getObsStatusColor(obs.status)}`}>
                              {obs.status}
                            </span>
                            </div>
                            <div className="text-gray-700 text-sm mb-1">
                            <strong>Observation:</strong> {obs.observation}
                            </div>
                            {obs.corrective && (
                            <div className="text-xs text-green-700 mb-1"><b>Corrective:</b> {obs.corrective}</div>
                            )}
                            {obs.recommendation && (
                            <div className="text-xs text-blue-700 mb-1"><b>Recommendation:</b> {obs.recommendation}</div>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                            <span>By: {obs.name || "Anonymous"}</span>
                            {" | "}
                            <span>Date: {obs.date}</span>
                            </div>
                            {/* Action Buttons */}
                            {obs.status === "OPEN" && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-blue-700 text-white hover:bg-blue-800"
                                onClick={() => setViewObservation(obs)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-red-700 text-white hover:bg-red-800"
                                onClick={() => {
                                  setEscalateObsId(obs.id);
                                  setEscalateIncidentId(null);
                                  setCodeInput("");
                                }}
                              >
                                <Lock className="w-3 h-3 mr-1" />
                                Archive
                              </Button>
                            </div>
                            )}
                            </div>
                            ))
                            )}
                            </div>
                            </CardContent>
                            </Card>
                            </div>

                            {/* --- Command Team Status + Muster Analytics --- */}
                            <div>
                            <Card className="hydro-card">
                            <CardHeader>
                            <CardTitle className="text-xl font-bold text-hydro-dark flex items-center gap-2">
                            <Users className="text-primary" />
                            Command Team Status
                            </CardTitle>
                            </CardHeader>
                            <CardContent>
                            <div className="space-y-3">
                            {/* Jarvis analytics: Muster stats, fastest, outstanding */}
                            {activeIncident && (
                            <div className="mb-2">
                            <div className="flex items-center gap-2 text-base font-semibold">
                            <span className="text-green-700">{acks.length}</span>
                            <span>/</span>
                            <span className="text-hydro-dark">{teamMembers.length}</span>
                            <span>mustered</span>
                            <span className="ml-2 text-xs text-gray-600">
                            (
                            {teamMembers.length > 0
                              ? Math.round((acks.length / teamMembers.length) * 100)
                              : 0}
                            %)
                            </span>
                            </div>
                            {acks.length > 0 && (
                            <div className="text-xs text-hydro-dark flex items-center gap-2 mt-1">
                            <Award className="w-4 h-4 text-yellow-500" />
                            Fastest:
                            <span className="font-bold text-orange-600">
                              {acks
                                .sort((a, b) =>
                                  (a.time || new Date(a.acknowledgedAt ?? 0).getTime()) -
                                  (b.time || new Date(b.acknowledgedAt ?? 0).getTime())
                                )[0]?.name ?? ""}
                            </span>
                            <span>
                              (
                              {acks.length > 0
                                ? `${Math.round(
                                    (acks[0].time
                                      ? (acks[0].time - new Date(activeIncident.startTime).getTime()) / 1000
                                      : 0
                                    )
                                  )}s`
                                : ""}
                              )
                            </span>
                            <span className="ml-auto text-xs text-gray-400 italic">
                              Avg:{" "}
                              {acks.length > 0
                                ? Math.round(
                                    acks
                                      .map((ack) =>
                                        (ack.time
                                          ? (ack.time - new Date(activeIncident.startTime).getTime()) / 1000
                                          : 0
                                        )
                                      )
                                      .reduce((a, b) => a + b, 0) / acks.length
                                  ) + "s"
                                : "—"}
                            </span>
                            </div>
                            )}
                            {/* List not yet mustered */}
                            <div className="mt-2 text-xs text-orange-600">
                            Waiting for:{" "}
                            {teamMembers
                            .filter(
                              (m) =>
                                !acks.some(
                                  (a) =>
                                    a.userId === m.id ||
                                    a.email === m.title ||
                                    a.name
                                      ?.toLowerCase()
                                      .includes(m.firstName.toLowerCase())
                                )
                            )
                            .map((m) => `${m.firstName} ${m.lastName}`)
                            .join(", ") || "—"}
                            </div>
                            </div>
                            )}

                            {/* List team status */}
                            {[...teamMembers]
                            .sort((a, b) => {
                            const order = { GOLD: 0, SILVER: 1, BRONZE: 2 };
                            return order[a.role] - order[b.role];
                            })
                            .map((member) => (
                            <div
                            key={member.id}
                            className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            member.role === "GOLD"
                              ? "border-yellow-300 bg-yellow-50"
                              : member.role === "SILVER"
                              ? "border-gray-300 bg-gray-100"
                              : "border-orange-300 bg-orange-50"
                            )}
                            >
                            <div className="flex items-center space-x-3">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.firstName}
                                className="w-10 h-10 rounded-full object-cover border"
                              />
                            ) : (
                              <div
                                className={cn(
                                  "w-10 h-10 text-white rounded-full flex items-center justify-center font-medium text-sm",
                                  member.role === "GOLD"
                                    ? "bg-yellow-400 text-yellow-900"
                                    : member.role === "SILVER"
                                    ? "bg-gray-400 text-gray-800"
                                    : "bg-orange-400 text-orange-800"
                                )}
                              >
                                {(member.firstName?.[0] ?? "") +
                                  (member.lastName?.[0] ?? "")}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-hydro-dark">
                                {member.firstName} {member.lastName}
                              </div>
                              <div className="text-sm text-gray-600">
                                {member.role} {member.title ? `- ${member.title}` : ""}
                              </div>
                            </div>
                            </div>
                            <div className="flex items-center space-x-2">
                            <div
                              className={cn(
                                "w-3 h-3 rounded-full",
                                member.status === "Active"
                                  ? "bg-green-500"
                                  : member.status === "On Duty"
                                  ? "bg-blue-500"
                                  : member.status === "Field Operations"
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                              )}
                            ></div>
                            <span
                              className={cn(
                                member.status === "Active"
                                  ? "text-green-700"
                                  : member.status === "On Duty"
                                  ? "text-blue-600"
                                  : member.status === "Field Operations"
                                  ? "text-yellow-700"
                                  : "text-gray-500",
                                "text-sm font-medium"
                              )}
                            >
                              {member.status || "—"}
                            </span>
                            </div>
                            </div>
                            ))}
                            </div>
                            </CardContent>
                            </Card>
                            </div>
                            </div>

                            {/* Emergency Modal */}
                            <EmergencyModal open={showModal} onClose={() => setShowModal(false)} teamMembers={teamMembers} />

                            {/* Escalate Dialog */}
                            {(escalateObsId || escalateIncidentId) && (
                            <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center" style={{ backdropFilter: "blur(2px)" }}>
                            <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-xs w-full relative">
                            <h3 className="font-bold text-lg mb-4 text-red-700 flex items-center">
                            <Lock className="w-5 h-5 mr-2" />
                            Escalate {escalateObsId ? "Observation" : "Incident"}
                            </h3>
                            <p className="text-gray-600 mb-4">
                            Enter escalation code to close this item. (Hint: <span className="font-mono bg-gray-100 px-2 py-1 rounded">000</span>)
                            </p>
                            <input
                            type="password"
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value)}
                            autoFocus
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-base outline-none"
                            placeholder="Escalation code"
                            onKeyDown={(e) => {
                            if (e.key === "Enter") handleEscalateConfirm();
                            if (e.key === "Escape") {
                            setEscalateObsId(null);
                            setEscalateIncidentId(null);
                            setCodeInput("");
                            }
                            }}
                            />
                            <div className="flex gap-2">
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleEscalateConfirm}>Confirm</Button>
                            <Button variant="outline" onClick={() => {
                            setEscalateObsId(null);
                            setEscalateIncidentId(null);
                            setCodeInput("");
                            }}>
                            Cancel
                            </Button>
                            </div>
                            </div>
                            </div>
                            )}

                            {/* View Incident Modal — with Headcount Map */}
                            {viewIncident && (
                            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" style={{ backdropFilter: "blur(2px)" }}>
                            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full relative">
                            <button className="absolute right-4 top-4 text-gray-400 hover:text-red-600" onClick={() => setViewIncident(null)}>
                            <X className="w-6 h-6" />
                            </button>
                            <h2 className="text-2xl font-bold text-hydro-dark mb-4 flex items-center">
                            <AlertTriangle className="text-orange-500 mr-2" />
                            {viewIncident.title}
                            </h2>
                            <div className="mb-3 text-sm text-gray-700">
                            <div><b>Status:</b> {viewIncident.status}</div>
                            <div><b>Priority:</b> {viewIncident.priority}</div>
                            <div><b>Started:</b> {viewIncident.startTime ? new Date(viewIncident.startTime).toLocaleString() : "-"}</div>
                            {viewIncident.description && (
                            <div className="mt-2">
                            <b>Description:</b> {viewIncident.description}
                            </div>
                            )}
                            </div>
                            {/* Headcount Map */}
                            <div className="mt-6 mb-1">
                            <h3 className="font-bold text-xl mb-2 flex items-center">
                            <Users className="mr-2 text-blue-500" /> Headcount Map: Mustered Personnel
                            </h3>
                            <div className="w-full">
                            <TeamHeadcountMap 
                              acks={acks} 
                              teamMembers={teamMembers}
                              incidentStartTime={viewIncident.startTime ? new Date(viewIncident.startTime).getTime() : Date.now()}
                            />
                            </div>
                            {/* Acknowledged List */}
                            <div className="mt-5">
                            <h4 className="font-bold text-lg mb-2">Acknowledged List</h4>
                            <div className="space-y-2">
                            {acks.length === 0 ? (
                            <div className="text-gray-400">No one has acknowledged yet.</div>
                            ) : (
                            acks.map((ack) => (
                            <div key={ack.id} className="flex items-center gap-2 p-2 border rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-hydro-dark">
                              {(ack.name?.[0] ?? "U").toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{ack.name}
                                {ack.role ? (<span className="ml-2 text-xs text-gray-500">({ack.role})</span>) : null}
                              </div>
                              <div className="text-xs text-gray-500">{ack.email}</div>
                            </div>
                            {ack.acknowledgedAt && (
                              <div className="text-xs text-gray-600">
                                {new Date(ack.acknowledgedAt).toLocaleTimeString()}
                              </div>
                            )}
                            {ack.hasLocation && <span className="text-xs text-green-600 ml-2">📍</span>}
                            </div>
                            ))
                            )}
                            </div>
                            </div>
                            </div>
                            </div>
                            </div>
                            )}

                            {/* View Observation Modal */}
                            {viewObservation && (
                            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" style={{ backdropFilter: "blur(2px)" }}>
                            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
                            <button className="absolute right-4 top-4 text-gray-400 hover:text-red-600" onClick={() => setViewObservation(null)}>
                            <X className="w-6 h-6" />
                            </button>
                            <h2 className="text-xl font-bold text-blue-800 mb-4">
                            Observation Detail
                            </h2>
                            <div className="mb-3 text-sm text-gray-700">
                            <div><b>Status:</b> {viewObservation.status}</div>
                            <div><b>Type:</b> {viewObservation.type.join(", ")}</div>
                            <div><b>Location:</b> {viewObservation.location}</div>
                            <div><b>Observation:</b> {viewObservation.observation}</div>
                            {viewObservation.corrective && (
                            <div><b>Corrective:</b> {viewObservation.corrective}</div>
                            )}
                            {viewObservation.recommendation && (
                            <div><b>Recommendation:</b> {viewObservation.recommendation}</div>
                            )}
                            <div><b>Reported by:</b> {viewObservation.name || "Anonymous"}</div>
                            <div><b>Date:</b> {viewObservation.date}</div>
                            <div><b>Closed Out:</b> {viewObservation.closedOut}</div>
                            </div>
                            </div>
                            </div>
                            )}
                            </div>
                            );
                            }

                            export default CommandDashboard;