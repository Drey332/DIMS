import React, { useState, useEffect, useMemo } from "react";
import EmergencyModal from "./EmergencyModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Bell, Eye, Lock, X, Clock10, Award, UserCheck, UserX } from "lucide-react";
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

// --- Type Definitions ---
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
  lat: number | null;
  lng: number | null;
  reporter?: string;
  submittedBy?: string;
  submitterName?: string;
  submitterEmail?: string;
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
  email?: string;
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
  time?: number;
};

const getUserInitials = (name: string): string => {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
};

export function CommandDashboard() {
  // --- State ---
  const [showModal, setShowModal] = useState(false);
  const [incidentView, setIncidentView] = useState<'ACTIVE' | 'CLOSED' | 'ALL'>('ACTIVE');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [obsView, setObsView] = useState<'OPEN' | 'CLOSED' | 'ALL'>('OPEN');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [obsLoading, setObsLoading] = useState(true);
  const [nearMisses, setNearMisses] = useState<Observation[]>([]);
  const [nearMissesLoading, setNearMissesLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [acks, setAcks] = useState<Ack[]>([]);
  const [incidentAcks, setIncidentAcks] = useState<Record<string, Ack[]>>({});
  const [escalateObsId, setEscalateObsId] = useState<string | null>(null);
  const [escalateIncidentId, setEscalateIncidentId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [viewIncident, setViewIncident] = useState<Incident | null>(null);
  const [viewObservation, setViewObservation] = useState<Observation | null>(null);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);

  // --- Firestore Listeners ---
  useEffect(() => {
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

  useEffect(() => {
    async function fetchObservations() {
      setObsLoading(true);
      let q;
      if (obsView === "ALL") {
        q = query(
          collection(db, "observations"),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(
          collection(db, "observations"),
          where("status", "==", obsView),
          orderBy("createdAt", "desc")
        );
      }
      const snapshot = await getDocs(q);
      const allObs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Observation));
      
      // Filter out Near Miss items client-side to avoid complex Firestore queries
      const filteredObs = allObs.filter(obs => {
        const types = obs.type || [];
        const hasNearMissType = types.includes("Near-miss") || 
                               types.includes("NEAR_MISS") || 
                               types.includes("near-miss") ||
                               types.some(t => t && t.toLowerCase().includes("near"));
        
        const hasNearMissStatus = obs.status && obs.status.toLowerCase().includes("near");
        
        return !hasNearMissType && !hasNearMissStatus;
      });
      
      setObservations(filteredObs);
      setObsLoading(false);
    }
    fetchObservations();
  }, [obsView, showModal]);

  // Fetch Near Misses separately with simpler query
  useEffect(() => {
    async function fetchNearMisses() {
      setNearMissesLoading(true);
      try {
        // Get all observations and filter client-side
        const q = query(
          collection(db, "observations"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const allObs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Observation));
        
        console.log("All observations fetched:", allObs.length);
        console.log("Sample observation:", allObs[0]);
        
        // Filter for Near Miss items client-side (check multiple variations)
        const nearMissObs = allObs.filter(obs => {
          const types = obs.type || [];
          const hasNearMissType = types.includes("Near-miss") || 
                                 types.includes("NEAR_MISS") || 
                                 types.includes("near-miss") ||
                                 types.some(t => t && t.toLowerCase().includes("near"));
          
          const hasNearMissStatus = obs.status && obs.status.toLowerCase().includes("near");
          
          console.log(`Checking obs ${obs.id}:`, {
            types,
            status: obs.status,
            hasNearMissType,
            hasNearMissStatus
          });
          
          return hasNearMissType || hasNearMissStatus;
        });
        
        console.log("Filtered Near Miss observations:", nearMissObs);
        setNearMisses(nearMissObs);
      } catch (error) {
        console.error("Error fetching near misses:", error);
        setNearMisses([]);
      }
      setNearMissesLoading(false);
    }
    fetchNearMisses();
  }, [showModal]);

  // --- NEAR MISS FETCH ---
  useEffect(() => {
    async function fetchNearMisses() {
      setNearMissesLoading(true);
      // If Near Misses are stored in "nearMisses"
      const q = query(collection(db, "nearMisses"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setNearMisses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Observation)));
      setNearMissesLoading(false);
    }
    fetchNearMisses();
  }, [showModal]);

  // --- ACKS for all incidents (per-incident isolation) ---
  useEffect(() => {
    if (!incidents.length) {
      setAcks([]);
      setIncidentAcks({});
      setActiveIncident(null);
      return;
    }

    const inc = incidents.find(inc => inc.status === "ACTIVE") || incidents[0];
    setActiveIncident(inc);

    // Set up listeners for ALL incidents to ensure proper data isolation
    const unsubscribers: Array<() => void> = [];

    incidents.forEach(incident => {
      const unsub = onSnapshot(
        collection(db, "emergencies", incident.id, "acks"),
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

          // Update per-incident acks storage
          setIncidentAcks(prev => ({
            ...prev,
            [incident.id]: processedAcks
          }));

          // If this is the active incident, also update the main acks state
          if (incident.id === inc?.id) {
            setAcks(processedAcks);
          }
        }
      );
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [incidents]);

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

  const ackedIds = useMemo(() => new Set(acks.map((a) => a.userId)), [acks]);
  const waiting = useMemo(
    () => teamMembers.filter((m) => !ackedIds.has(m.id)),
    [teamMembers, ackedIds]
  );
  const musterPct = useMemo(
    () =>
      teamMembers.length === 0
        ? 0
        : Math.round((acks.length / teamMembers.length) * 100),
    [acks.length, teamMembers.length]
  );
  const fastest = useMemo(() => {
    if (!activeIncident || acks.length === 0) return null;
    const start = new Date(activeIncident.startTime).getTime();
    return acks
      .map((ack) => ({
        ...ack,
        delta:
          ack.acknowledgedAt
            ? Math.round(
                (new Date(ack.acknowledgedAt).getTime() - start) / 1000
              )
            : null,
      }))
      .filter((a) => typeof a.delta === "number" && a.delta! >= 0)
      .sort((a, b) => (a.delta! < b.delta! ? -1 : 1))[0];
  }, [acks, activeIncident]);

  const viewedIncidentMetrics = useMemo(() => {
    if (!viewIncident) return null;
    const viewedAcks = incidentAcks[viewIncident.id] || [];
    const viewedAckedIds = new Set(viewedAcks.map((a) => a.userId));
    const viewedWaiting = teamMembers.filter((m) => !viewedAckedIds.has(m.id));
    const viewedMusterPct = teamMembers.length === 0 ? 0 : Math.round((viewedAcks.length / teamMembers.length) * 100);

    let viewedFastest = null;
    if (viewedAcks.length > 0) {
      const start = new Date(viewIncident.startTime).getTime();
      viewedFastest = viewedAcks
        .map((ack) => ({
          ...ack,
          delta: ack.acknowledgedAt ? Math.round((new Date(ack.acknowledgedAt).getTime() - start) / 1000) : null,
        }))
        .filter((a) => typeof a.delta === "number" && a.delta! >= 0)
        .sort((a, b) => (a.delta! < b.delta! ? -1 : 1))[0];
    }

    return {
      ackedIds: viewedAckedIds,
      waiting: viewedWaiting,
      musterPct: viewedMusterPct,
      fastest: viewedFastest,
      totalAcks: viewedAcks.length
    };
  }, [viewIncident, incidentAcks, teamMembers]);

  return (
    <div className="px-2 md:px-3 pb-8 max-w-[1440px] mx-auto bg-gray-50">
      {/* --- Filter Controls --- */}
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
          <Card className="hydro-card bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-2xl font-black text-hydro-dark flex items-center gap-2">
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
                      incident.priority === 'CRITICAL' ? 'bg-red-500 animate-pulse'
                        : incident.priority === 'HIGH' ? 'bg-orange-500 animate-pulse-slow'
                          : 'bg-yellow-500'
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
                      <div className="absolute top-2 right-2 text-xs text-red-600 font-bold uppercase">
                      {(incidentAcks[incident.id] || []).length} / {teamMembers.length} Mustered
                      </div>
                      </div>
                      ))
                      )}
                      </div>
                      </CardContent>
                      </Card>

                      {/* --- Near Misses --- */}
                      <Card className="hydro-card bg-white mt-6">
                        <CardHeader>
                          <CardTitle className="text-xl font-bold text-hydro-dark flex items-center">
                            <AlertTriangle className="text-yellow-500 mr-3 h-5 w-5" />
                            Near Miss Reports
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="text-xs text-gray-400 mb-2">
                              Debug Info: Loading={nearMissesLoading.toString()}, Count={nearMisses.length}
                            </div>
                            {nearMissesLoading ? (
                              <div className="text-center py-8">Loading near misses...</div>
                            ) : nearMisses.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                No near misses reported. (Debug: {nearMisses.length} found)
                              </div>
                            ) : (
                              nearMisses.map((nearMiss) => (
                                <div key={nearMiss.id} className="rounded-xl p-5 border bg-yellow-50 border-yellow-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <Badge className="bg-yellow-500 text-white font-semibold">Near Miss</Badge>
                                      <span className="ml-2 text-sm text-gray-600">{nearMiss.location}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {nearMiss.createdAt ? new Date(nearMiss.createdAt).toLocaleDateString() : ""}
                                    </span>
                                  </div>
                                  <div className="text-gray-700 text-sm mb-2">
                                    <strong>Description:</strong> {nearMiss.observation}
                                  </div>
                                  {nearMiss.recommendation && (
                                    <div className="text-sm text-blue-700 mb-2">
                                      <b>Recommendation:</b> {nearMiss.recommendation}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500 mt-2">
                                    <span>Reported by: {nearMiss.submitterName || nearMiss.reporter || nearMiss.name || "Anonymous"}</span>
                                    {nearMiss.createdAt && (
                                      <>
                                        {" | "}
                                        <span>Time: {new Date(nearMiss.createdAt).toLocaleTimeString()}</span>
                                      </>
                                    )}
                                    {nearMiss.submitterEmail && (
                                      <div className="text-xs text-gray-500">
                                        Email: {nearMiss.submitterEmail}
                                      </div>
                                    )}
                                    {nearMiss.date && (
                                      <div className="text-xs text-gray-500">
                                        Date: {nearMiss.date}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* --- Observations --- */}
                      <Card className="hydro-card bg-white mt-6">
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
                      <div className="text-center py-8 text-gray-500">
                      No observations found.
                      </div>
                      ) : (
                      observations.map((obs) => (
                      <div key={obs.id} className="rounded-xl p-5 border bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                      <div>
                      <span className="font-semibold text-blue-700">{obs.type.join(", ")}</span>
                      <span className="ml-2 text-sm text-gray-600">{obs.location}</span>
                      </div>
                      <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold",
                      getObsStatusColor(obs.status)
                      )}>
                      {obs.status}
                      </span>
                      </div>
                      <div className="text-gray-700 text-sm mb-1">
                      <strong>Observation:</strong> {obs.observation}
                      </div>
                      {obs.corrective && (
                      <div className="text-xs text-green-700 mb-1">
                      <b>Corrective:</b> {obs.corrective}
                      </div>
                      )}
                      {obs.recommendation && (
                      <div className="text-xs text-blue-700 mb-1">
                      <b>Recommendation:</b> {obs.recommendation}
                      </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                      <span>By: {obs.name || "Anonymous"}</span>
                      {" | "}
                      <span>Date: {obs.date}</span>
                      </div>
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
                      <Card className="hydro-card bg-white">
                      <CardHeader>
                      <CardTitle className="text-xl font-bold text-hydro-dark flex items-center gap-2">
                      <Users className="text-primary" />
                      Command Team Status
                      </CardTitle>
                      </CardHeader>
                      <CardContent>
                      <div className="space-y-4">
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
                      {fastest?.name ?? ""}
                      </span>
                      <span>
                      (
                      {fastest?.delta !== undefined
                        ? `${fastest.delta}s`
                        : ""}
                      )
                      </span>
                      <span className="ml-auto text-xs text-gray-400 italic">
                      Avg:{" "}
                      {acks.length > 0 && activeIncident
                        ? Math.round(
                            acks
                              .map((ack) =>
                                (ack.time
                                  ? (ack.time -
                                      new Date(activeIncident.startTime).getTime()) /
                                    1000
                                  : 0
                                )
                              )
                              .reduce((a, b) => a + b, 0) / acks.length
                          ) + "s"
                        : "—"}
                      </span>
                      </div>
                      )}
                      <div className="mt-2 text-xs text-orange-600">
                      <UserX className="inline-block mr-1 w-4 h-4" />
                      Waiting for:{" "}
                      {waiting.length > 0
                      ? waiting
                        .map((m) => `${m.firstName} ${m.lastName}`)
                        .join(", ")
                      : "—"}
                      </div>
                      </div>
                      )}

                      {/* Team status list */}
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
                        {member.role}{" "}
                        {member.title ? `- ${member.title}` : ""}
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
                      <EmergencyModal
                      open={showModal}
                      onClose={() => setShowModal(false)}
                      teamMembers={teamMembers}
                      />

                      {/* Escalate Dialog */}
                      {(escalateObsId || escalateIncidentId) && (
                      <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center" style={{ backdropFilter: "blur(2px)" }}>
                      <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-xs w-full relative">
                      <h3 className="font-bold text-lg mb-4 text-red-700 flex items-center">
                      <Lock className="w-5 h-5 mr-2" />
                      Escalate {escalateObsId ? "Observation" : "Incident"}
                      </h3>
                      <p className="text-gray-600 mb-4">
                      Enter escalation code to close this item. (Hint:{" "}
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">000</span>)
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
                      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full relative flex flex-col max-h-[95vh] overflow-y-auto"
                      style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
                      <button
                      className="absolute right-4 top-4 text-gray-400 hover:text-red-600"
                      onClick={() => setViewIncident(null)}
                      >
                      <X className="w-6 h-6" />
                      </button>
                      <div className="p-5 sm:p-8 flex flex-col gap-5">
                      <h2 className="text-2xl font-bold text-hydro-dark mb-2 flex items-center">
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
                      {(viewIncident as any).initiatorName && (
                      <div className="mt-2">
                      <b>Submitted by:</b> {(viewIncident as any).initiatorName}
                      {(viewIncident as any).initiatorEmail && (
                      <span className="text-xs ml-2 text-gray-500">({(viewIncident as any).initiatorEmail})</span>
                      )}
                      </div>
                      )}
                      {(viewIncident as any).submittedAt && (
                      <div>
                      <b>Submission time:</b> {new Date((viewIncident as any).submittedAt).toLocaleString()}
                      </div>
                      )}
                      {((viewIncident as any).lat && (viewIncident as any).lng) && (
                      <div>
                      <b>Submitter location:</b> {(viewIncident as any).lat.toFixed(6)}, {(viewIncident as any).lng.toFixed(6)}
                      </div>
                      )}
                      </div>
                      {viewedIncidentMetrics && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-bold text-blue-900 mb-2">Incident Statistics</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><b>Response Rate:</b> {viewedIncidentMetrics.musterPct}% ({viewedIncidentMetrics.totalAcks}/{teamMembers.length})</div>
                      <div><b>Waiting:</b> {viewedIncidentMetrics.waiting.length} personnel</div>
                      {viewedIncidentMetrics.fastest && (
                      <>
                      <div><b>Fastest Response:</b> {viewedIncidentMetrics.fastest.name}</div>
                      <div><b>Response Time:</b> {viewedIncidentMetrics.fastest.delta}s</div>
                      </>
                      )}
                      </div>
                      </div>
                      )}
                      <div className="bg-white rounded-3xl shadow-2xl border border-blue-200 p-4 sm:p-8 w-full mx-auto">
                        <h3 className="font-extrabold text-2xl mb-6 flex items-center gap-3 text-blue-700 tracking-tight">
                          <Users className="w-8 h-8 text-sky-600" />
                          Headcount Map: Mustered Personnel
                        </h3>
                        <div className="w-full h-[350px] rounded-xl border border-blue-200 shadow overflow-hidden mb-6">
                          <TeamHeadcountMap
                            acks={incidentAcks[viewIncident.id] || []}
                            teamMembers={teamMembers}
                            incidentStartTime={viewIncident.startTime
                              ? new Date(viewIncident.startTime).getTime()
                              : Date.now()}
                            enableReplay={true}
                            replayWindow={5 * 60 * 1000}
                          />
                        </div>
                        </div>
                        <div className="mt-2">
                        <h4 className="font-bold text-lg mb-2 flex items-center">
                          <UserCheck className="text-green-600 mr-2" />
                          Acknowledged List
                        </h4>
                        <div className="space-y-2">
                          {(incidentAcks[viewIncident.id] || []).length === 0 ? (
                            <div className="text-gray-400">No one has acknowledged yet.</div>
                          ) : (
                            (incidentAcks[viewIncident.id] || []).map((ack) => (
                              <div key={ack.id} className="flex items-center gap-2 p-2 border rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-hydro-dark">
                                  {getUserInitials(ack.name)}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {ack.name}
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

                        {/* View Observation Modal (used for Observation and Near Misses) */}
                        {viewObservation && (
                        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" style={{ backdropFilter: "blur(2px)" }}>
                        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
                        <button className="absolute right-4 top-4 text-gray-400 hover:text-red-600" onClick={() => setViewObservation(null)}>
                        <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-blue-800 mb-4">
                        {viewObservation.type?.includes("Near-miss") ? "Near Miss Detail" : "Observation Detail"}
                        </h2>
                        <div className="mb-3 text-sm text-gray-700">
                        <div><b>Status:</b> {viewObservation.status}</div>
                        <div><b>Type:</b> {viewObservation.type?.join(", ")}</div>
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