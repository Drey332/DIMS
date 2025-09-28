// src/components/ProjectAnalyticsDashboard.tsx

import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, AlertTriangle, Eye, Clock, CheckCircle, TrendingUp, Download,
  FileText, MapPin, Shield, DollarSign, Timer, BarChart3, PieChart as PieChartIcon, Zap
} from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import TeamHeadcountMap from "@/components/TeamHeadcountMap"; // adjust path if needed
import AIProjectAnalyticsTab from "@/components/AIProjectAnalyticsTab"; // <-- import the AI tab!
import { EnvironmentalContextCard } from "@/components/environmental-context-card";
import { EarthNullschoolGlobe } from "@/components/EarthNullschoolGlobe";

type Incident = {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  createdAt: string;
  startTime: string;
  description?: string;
  initiatedBy?: string;
  initiatorName?: string;
  initiatorEmail?: string;
  projectId?: string;
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
  createdAt: string;
  status: string;
  lat?: number;
  lng?: number;
};

type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  title?: string;
  status?: string;
};

type Ack = {
  id: string;
  userId: string;
  name: string;
  email?: string;
  acknowledgedAt: string;
  time?: number;
  lat?: number;
  lng?: number;
  hasLocation?: boolean;
  incidentId?: string;
  role?: string;
};

const COLORS = [
  "#2563eb", "#0ea5e9", "#10b981", "#f59e42",
  "#f43f5e", "#a21caf", "#eab308", "#3b82f6"
];

// === Main analytics tabs: now includes "AI Analysis" ===
const VIEWS = [
  { key: "live", label: "Live Analytics", icon: TrendingUp },
  { key: "history", label: "History", icon: Clock },
  { key: "replay", label: "Incident Replay", icon: Users },
  { key: "performance", label: "Performance", icon: BarChart3 },
  { key: "roi", label: "ROI Analysis", icon: DollarSign },
  { key: "ai", label: "AI Analysis", icon: Zap }, // <--- Add AI tab here
] as const;
type ViewType = typeof VIEWS[number]["key"];

interface ProjectAnalyticsDashboardProps {
  projectId: string;
  projectName?: string;
  projectLocation?: string;
  projectNumber?: string;
}

const ProjectAnalyticsDashboard: React.FC<ProjectAnalyticsDashboardProps> = ({
  projectId,
  projectName,
  projectLocation,
  projectNumber,
}) => {
  // --- Data State ---
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [acks, setAcks] = useState<Record<string, Ack[]>>({});
  const [loading, setLoading] = useState(true);

  const environmentLocationName = useMemo(() => {
    if (projectLocation && projectLocation.trim().length > 0) {
      return projectLocation.trim();
    }
    const observationWithLocation = observations.find(
      (obs) => typeof obs.location === "string" && obs.location.trim().length > 0
    );
    return observationWithLocation?.location.trim();
  }, [projectLocation, observations]);

  const environmentCoordinates = useMemo(() => {
    for (const obs of observations) {
      if (
        typeof obs.lat === "number" &&
        typeof obs.lng === "number" &&
        Number.isFinite(obs.lat) &&
        Number.isFinite(obs.lng)
      ) {
        return { latitude: obs.lat, longitude: obs.lng };
      }
    }

    for (const ackList of Object.values(acks)) {
      for (const ack of ackList) {
        if (
          typeof ack.lat === "number" &&
          typeof ack.lng === "number" &&
          Number.isFinite(ack.lat) &&
          Number.isFinite(ack.lng)
        ) {
          return { latitude: ack.lat, longitude: ack.lng };
        }
      }
    }

    return undefined;
  }, [observations, acks]);

  // --- UI State ---
  const [selectedView, setSelectedView] = useState<ViewType>("live");
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [fastestResponders, setFastestResponders] = useState<Record<string, { name: string; time: number; incident: string }>>({});

  // --- Fetch Data ---
  useEffect(() => {
    setLoading(true);

    const unsubIncidents = onSnapshot(
      query(collection(db, "emergencies"), orderBy("createdAt")),
      snap => {
        const incidentData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
        setIncidents(incidentData);
        if (!selectedIncident && incidentData.length > 0) {
          setSelectedIncident(incidentData[0].id);
        }
      }
    );

    const unsubObservations = onSnapshot(
      query(collection(db, "observations"), orderBy("createdAt")),
      snap => setObservations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Observation)))
    );

    const unsubTeam = onSnapshot(
      query(collection(db, "projects", projectId, "teamMembers")),
      snap => setTeamMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember)))
    );

    let ackUnsubs: Array<() => void> = [];
    function setupAckListeners() {
      ackUnsubs.forEach(fn => fn());
      ackUnsubs = [];
      incidents.forEach(inc => {
        const unsub = onSnapshot(
          collection(db, "emergencies", inc.id, "acks"),
          snap => {
            const ackData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ack));
            setAcks(prev => ({
              ...prev,
              [inc.id]: ackData
            }));
            // Calculate fastest responder for this incident
            if (ackData.length > 0) {
              const incidentStartTime = new Date(inc.startTime).getTime();
              const fastest = ackData.reduce((fastest, ack) => {
                const responseTime = (ack.time || new Date(ack.acknowledgedAt).getTime()) - incidentStartTime;
                return responseTime < fastest.time ? { name: ack.name, time: responseTime, incident: inc.id } : fastest;
              }, { name: '', time: Infinity, incident: inc.id });
              if (fastest.time !== Infinity) {
                setFastestResponders(prev => ({
                  ...prev,
                  [inc.id]: fastest
                }));
              }
            }
          }
        );
        ackUnsubs.push(unsub);
      });
    }
    setupAckListeners();

    setTimeout(() => setLoading(false), 800);
    return () => {
      unsubIncidents();
      unsubObservations();
      unsubTeam();
      ackUnsubs.forEach(fn => fn());
    };
    // eslint-disable-next-line
  }, [projectId, incidents.length]);

  // --- Metrics ---
  const trendData = useMemo(() => {
    const map: Record<string, { date: string; incidents: number; observations: number }> = {};
    incidents.forEach(inc => {
      const date = inc.createdAt ? inc.createdAt.slice(0, 10) : "";
      if (!map[date]) map[date] = { date, incidents: 0, observations: 0 };
      map[date].incidents += 1;
    });
    observations.forEach(obs => {
      const date = obs.createdAt ? obs.createdAt.slice(0, 10) : "";
      if (!map[date]) map[date] = { date, incidents: 0, observations: 0 };
      map[date].observations += 1;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [incidents, observations]);

  const obsTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    observations.forEach(obs =>
      obs.type.forEach(t => { map[t] = (map[t] || 0) + 1; })
    );
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [observations]);

  const incTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    incidents.forEach(inc => {
      const type = inc.type || "Unknown";
      map[type] = (map[type] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const closureRate = useMemo(() => {
    if (!observations.length) return "N/A";
    const closed = observations.filter(o => o.status === "CLOSED").length;
    return `${Math.round((closed / observations.length) * 100)}%`;
  }, [observations]);

  const teamPerf = useMemo(() => {
    const perf: Record<string, { responses: number }> = {};
    Object.entries(acks).forEach(([, ackList]) => {
      ackList.forEach(ack => {
        perf[ack.userId] = perf[ack.userId] || { responses: 0 };
        perf[ack.userId].responses += 1;
      });
    });
    return teamMembers.map(m => ({
      ...m,
      responses: perf[m.id]?.responses || 0
    })).sort((a, b) => b.responses - a.responses);
  }, [acks, teamMembers]);

  const responseTimeMetrics = useMemo(() => {
    const times: number[] = [];
    const byIncident: Record<string, { 
      average: number; 
      fastest: number; 
      slowest: number; 
      count: number; 
      responses: { name: string; time: number; userId: string }[] 
    }> = {};

    Object.entries(acks).forEach(([incidentId, ackList]) => {
      const inc = incidents.find(i => i.id === incidentId);
      if (inc?.startTime && ackList.length) {
        const start = new Date(inc.startTime).getTime();
        const incidentTimes: number[] = [];
        const responses: { name: string; time: number; userId: string }[] = [];

        ackList.forEach(ack => {
          const ackTime = ack.time || new Date(ack.acknowledgedAt).getTime();
          if (Number.isFinite(ackTime) && ackTime > start) {
            const responseTime = (ackTime - start) / 60000; // Convert to minutes
            incidentTimes.push(responseTime);
            times.push(responseTime);
            responses.push({
              name: ack.name,
              time: responseTime,
              userId: ack.userId
            });
          }
        });

        if (incidentTimes.length > 0) {
          byIncident[incidentId] = {
            average: incidentTimes.reduce((a, b) => a + b, 0) / incidentTimes.length,
            fastest: Math.min(...incidentTimes),
            slowest: Math.max(...incidentTimes),
            count: incidentTimes.length,
            responses: responses.sort((a, b) => a.time - b.time)
          };
        }
      }
    });

    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const med = times.length ? [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)] : 0;
    return {
      average: avg,
      median: med,
      fastest: times.length ? Math.min(...times) : 0,
      slowest: times.length ? Math.max(...times) : 0,
      total: times.length,
      byIncident
    };
  }, [acks, incidents]);

  // --- ROI: Improve/expand the math here later
  const roiMetrics = useMemo(() => {
    const active = incidents.filter(i => i.status === "ACTIVE").length;
    const resolved = incidents.filter(i => i.status === "RESOLVED").length;
    const prevented = Math.max(0, observations.length - active);
    const avgCost = 50000;
    const estimatedSavings = prevented * avgCost * 0.3;
    return {
      active, resolved, prevented, estimatedSavings,
      responseImprovement: resolved > 0 ? (resolved / incidents.length) * 100 : 0
    };
  }, [incidents, observations]);


  function enrichAcksForMap(
    acks: Ack[],
    teamMembers: TeamMember[]
  ): {
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
  }[] {
    return acks.map(ack => {
      const member = teamMembers.find(m => m.id === ack.userId);
      const lat = typeof ack.lat === "number" ? ack.lat : null;
      const lng = typeof ack.lng === "number" ? ack.lng : null;
      return {
        ...ack,
        name:
          member
            ? `${member.firstName} ${member.lastName}`
            : (ack as any).name || "Unknown",
        avatarUrl: (ack as any).avatarUrl || null,
        email: (ack as any).email || null,
        hasLocation: typeof lat === "number" && typeof lng === "number",
        lat,
        lng,
        role: member?.role || (ack as any).role || null,
        acknowledgedAt: (ack as any).acknowledgedAt || null,
        time: (ack as any).time || undefined,
        locationError: (ack as any).locationError || null,
      };
    });
  }
  // --- Export Functions ---
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("HydroSafe Project Analytics Report", 10, 10);
    doc.save(`hydrosafe-analytics-${projectId}.pdf`);
  };
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incidents), "Incidents");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(observations), "Observations");
    XLSX.writeFile(wb, `hydrosafe-analytics-${projectId}.xlsx`);
  };

  // Export PDF of Map/Table (History tab)
  const exportMapTableToPDF = async () => {
    const input = document.getElementById('map-table-export');
    if (!input) return;
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    pdf.addImage(imgData, 'PNG', 40, 40, 750, 450);
    pdf.save(`hydrosafe-analytics-map-table-${projectId}.pdf`);
  };

  // --- Render ---
  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 space-y-8">
      {/* Header, Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">HydroSafe Analytics Dashboard</h1>
          <div className="text-gray-500 text-sm mt-1">
            {projectName
              ? `Insights for ${projectName}${projectNumber ? ` (${projectNumber})` : ""}`
              : "Project-wide safety & performance insights"}
          </div>
          {environmentLocationName && (
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              <span>{environmentLocationName}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} variant="outline"><FileText className="w-4 h-4 mr-2" />Export PDF</Button>
          <Button onClick={exportToExcel} variant="outline"><Download className="w-4 h-4 mr-2" />Export Excel</Button>
          <Button onClick={exportMapTableToPDF} variant="outline"><Download className="w-4 h-4 mr-2" />Download Report</Button>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {VIEWS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            onClick={() => setSelectedView(key as ViewType)}
            variant={selectedView === key ? "default" : "outline"}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Icon className="w-4 h-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center text-lg text-blue-500 py-12">Loading analytics…</div>
      ) : (
        <>
          {/* --- LIVE TAB --- */}
          {selectedView === "live" && (
            <div className="space-y-8">
              <EnvironmentalContextCard
                locationName={environmentLocationName}
                latitude={environmentCoordinates?.latitude}
                longitude={environmentCoordinates?.longitude}
              />

              <EarthNullschoolGlobe
                locationName={environmentLocationName}
                latitude={environmentCoordinates?.latitude}
                longitude={environmentCoordinates?.longitude}
              />

              {/* Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-medium">Incidents</CardTitle>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{incidents.length}</div>
                    <div className="text-xs text-slate-500">Total emergencies</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-medium">Observations</CardTitle>
                    <Eye className="w-5 h-5 text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{observations.length}</div>
                    <div className="text-xs text-slate-500">Safety observations</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-medium">Avg. Response Time</CardTitle>
                    <Clock className="w-5 h-5 text-purple-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{responseTimeMetrics.average.toFixed(1)}m</div>
                    <div className="text-xs text-slate-500">To first acknowledgment</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-medium">Closure Rate</CardTitle>
                    <CheckCircle className="w-5 h-5 text-amber-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{closureRate}</div>
                    <div className="text-xs text-slate-500">Actions completed</div>
                  </CardContent>
                </Card>
              </div>

              {/* Trends Area Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex gap-2 items-center text-lg font-bold">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Incident & Observation Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="c2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis dataKey="date" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="incidents" stroke="#2563eb" fill="url(#c1)" />
                        <Area type="monotone" dataKey="observations" stroke="#22d3ee" fill="url(#c2)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

                    {/* --- HISTORY TAB --- */}
                    {selectedView === "history" && (
                    <Card>
                    <CardHeader>
                    <CardTitle className="flex gap-2 items-center text-lg font-bold">
                      <Clock className="w-5 h-5 text-blue-500" /> Incident & Observation History
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="overflow-x-auto" id="map-table-export">
                      <table className="min-w-full text-left text-sm mt-2 border">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 font-bold">Date</th>
                            <th className="px-3 py-2 font-bold">Type</th>
                            <th className="px-3 py-2 font-bold">Title/Obs</th>
                            <th className="px-3 py-2 font-bold">Status</th>
                            <th className="px-3 py-2 font-bold">Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incidents.map(i => (
                            <tr key={i.id} className="border-b">
                              <td className="px-3 py-2">{i.createdAt?.slice(0, 10)}</td>
                              <td className="px-3 py-2">{i.type}</td>
                              <td className="px-3 py-2">{i.title}</td>
                              <td className="px-3 py-2">{i.status}</td>
                              <td className="px-3 py-2">—</td>
                            </tr>
                          ))}
                          {observations.map(obs => (
                            <tr key={obs.id} className="border-b">
                              <td className="px-3 py-2">{obs.createdAt?.slice(0, 10)}</td>
                              <td className="px-3 py-2">{obs.type.join(", ")}</td>
                              <td className="px-3 py-2">{obs.observation}</td>
                              <td className="px-3 py-2">{obs.status}</td>
                              <td className="px-3 py-2">{obs.location}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    </CardContent>
                    </Card>
                    )}

                    {/* --- REPLAY TAB --- */}
                    {selectedView === "replay" && (
                    <Card>
                    <CardHeader>
                    <CardTitle className="flex gap-2 items-center text-lg font-bold">
                      <Users className="w-5 h-5 text-blue-600" />
                      Per-Incident Muster Replay
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {incidents.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">No incidents to replay.</div>
                    ) : (
                      <div className="space-y-6">
                        {/* Incident Selector */}
                        <div className="space-y-3">
                          <label className="font-semibold text-slate-700">Select Incident to Replay:</label>
                          <select 
                            value={selectedIncident || incidents[0]?.id || ""} 
                            onChange={(e) => setSelectedIncident(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white"
                          >
                            {incidents.map(inc => (
                              <option key={inc.id} value={inc.id}>
                                {inc.title} - {new Date(inc.startTime).toLocaleDateString()} 
                                ({(acks[inc.id] || []).length} responses)
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedIncident && incidents.find(i => i.id === selectedIncident) && (
                          <>
                            {/* Incident Details */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h3 className="font-bold text-blue-900">Incident Details</h3>
                              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                                <div><strong>Started:</strong> {new Date(incidents.find(i => i.id === selectedIncident)!.startTime).toLocaleString()}</div>
                                <div><strong>Type:</strong> {incidents.find(i => i.id === selectedIncident)!.type}</div>
                                <div><strong>Priority:</strong> {incidents.find(i => i.id === selectedIncident)!.priority}</div>
                                <div><strong>Status:</strong> {incidents.find(i => i.id === selectedIncident)!.status}</div>
                                <div><strong>Initiated by:</strong> {incidents.find(i => i.id === selectedIncident)!.initiatorName || "Unknown"}</div>
                                <div><strong>Total Responses:</strong> {(acks[selectedIncident] || []).length}</div>
                              </div>
                            </div>

                            {/* Response Performance for Selected Incident */}
                            {responseTimeMetrics.byIncident[selectedIncident] && (
                              <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="font-bold text-green-900">Response Performance</h3>
                                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                                  <div><strong>Fastest:</strong> {responseTimeMetrics.byIncident[selectedIncident].fastest.toFixed(1)}m</div>
                                  <div><strong>Average:</strong> {responseTimeMetrics.byIncident[selectedIncident].average.toFixed(1)}m</div>
                                  <div><strong>Slowest:</strong> {responseTimeMetrics.byIncident[selectedIncident].slowest.toFixed(1)}m</div>
                                </div>
                                <div className="mt-3">
                                  <h4 className="font-semibold">Response Order:</h4>
                                  <div className="max-h-32 overflow-y-auto">
                                    {responseTimeMetrics.byIncident[selectedIncident].responses.map((resp, idx) => (
                                      <div key={resp.userId} className="text-xs py-1 border-b">
                                        #{idx + 1}: {resp.name} - {resp.time.toFixed(1)}m
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Map Replay */}
                            <div style={{ height: 420 }} className="border rounded-lg shadow">
                              <TeamHeadcountMap
                                acks={enrichAcksForMap(
                                  acks[selectedIncident] || [], 
                                  teamMembers
                                )}
                                teamMembers={teamMembers}
                                incidentStartTime={
                                  new Date(incidents.find(i => i.id === selectedIncident)!.startTime).getTime()
                                }
                                enableReplay={true}
                                replayWindow={5 * 60 * 1000}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    </CardContent>
                    </Card>
                    )}

                    {/* --- PERFORMANCE TAB --- */}
                    {selectedView === "performance" && (
                    <div className="space-y-6">
                    {/* Performance Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Fastest Overall Response</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {responseTimeMetrics.fastest.toFixed(1)}m
                        </div>
                        <div className="text-xs text-slate-500">Best emergency response time</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Average Response</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {responseTimeMetrics.average.toFixed(1)}m
                        </div>
                        <div className="text-xs text-slate-500">Across all incidents</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Team Participation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round((responseTimeMetrics.total / (incidents.length * teamMembers.length || 1)) * 100)}%
                        </div>
                        <div className="text-xs text-slate-500">Response rate per incident</div>
                      </CardContent>
                    </Card>
                    </div>

                    {/* Per-Incident Performance Table */}
                    <Card>
                    <CardHeader>
                      <CardTitle>Per-Incident Performance Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Incident</th>
                              <th className="text-left p-2">Started</th>
                              <th className="text-left p-2">Responses</th>
                              <th className="text-left p-2">Fastest</th>
                              <th className="text-left p-2">Average</th>
                              <th className="text-left p-2">Champion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {incidents.map(inc => {
                              const perf = responseTimeMetrics.byIncident[inc.id];
                              const fastest = fastestResponders[inc.id];
                              return (
                                <tr key={inc.id} className="border-b hover:bg-gray-50">
                                  <td className="p-2 font-medium">{inc.title}</td>
                                  <td className="p-2 text-gray-600">{new Date(inc.startTime).toLocaleDateString()}</td>
                                  <td className="p-2">{perf?.count || 0}</td>
                                  <td className="p-2 text-green-600">{perf?.fastest.toFixed(1) || "—"}m</td>
                                  <td className="p-2">{perf?.average.toFixed(1) || "—"}m</td>
                                  <td className="p-2">
                                    {fastest ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                        🏆 {fastest.name}
                                      </span>
                                    ) : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                    </Card>

                    {/* Team Member Performance */}
                    <Card>
                    <CardHeader>
                      <CardTitle>Team Response Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {teamPerf.slice(0, 12).map(member => (
                          <div key={member.id} className="p-3 border rounded-lg">
                            <div className="font-medium">{member.firstName} {member.lastName}</div>
                            <div className="text-sm text-gray-600">{member.role}</div>
                            <div className="text-lg font-bold text-blue-600">{member.responses}</div>
                            <div className="text-xs text-gray-500">emergency responses</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    </Card>
                    </div>
                    )}

                    {/* --- ROI ANALYSIS --- */}
                    {selectedView === "roi" && (
                    <Card>
                    <CardHeader>
                    <CardTitle className="flex gap-2 items-center text-lg font-bold">
                      <DollarSign className="w-5 h-5 text-yellow-400" />
                      ROI & Cost Savings
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          ${roiMetrics.estimatedSavings.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Estimated Savings</div>
                      </div>
                      <div className="text-center p-4">
                        <div className="text-2xl font-bold text-blue-600 mb-2">
                          {roiMetrics.prevented}
                        </div>
                        <div className="text-sm text-gray-500">Prevented Incidents</div>
                      </div>
                      <div className="text-center p-4">
                        <div className="text-2xl font-bold text-purple-600 mb-2">
                          {roiMetrics.responseImprovement.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500">Response Improvement</div>
                      </div>
                      <div className="text-center p-4">
                        <div className="text-2xl font-bold text-cyan-600 mb-2">
                          {Math.round((roiMetrics.estimatedSavings / 50000) * 100)}%
                        </div>
                        <div className="text-sm text-gray-500">ROI Efficiency</div>
                      </div>
                    </div>
                    </CardContent>
                    </Card>
                    )}

                    {/* --- AI ANALYSIS TAB --- */}
                    {selectedView === "ai" && (
                    <AIProjectAnalyticsTab projectId={projectId} />
                    )}

                    {/* --- Additional Charts --- */}
                    {selectedView !== "replay" && selectedView !== "ai" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    {/* Observation Type Pie */}
                    <Card>
                    <CardHeader>
                      <CardTitle className="flex gap-2 items-center text-base font-bold">
                        <PieChartIcon className="w-5 h-5 text-blue-600" />
                        Observation Type Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        {obsTypeData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={obsTypeData}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                outerRadius={80}
                                fill="#2563eb"
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              >
                                {obsTypeData.map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-400">
                            <div className="text-center">
                              <PieChartIcon className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                              <p>No observation data available</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    </Card>

                    {/* Incident Type Bar */}
                    <Card>
                    <CardHeader>
                      <CardTitle className="flex gap-2 items-center text-base font-bold">
                        <BarChart3 className="w-5 h-5 text-red-400" />
                        Incident Type Distribution
                        </CardTitle>
                        </CardHeader>
                        <CardContent>
                        <div className="h-80">
                        {incTypeData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={incTypeData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                              <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={60}
                                stroke="#64748b"
                              />
                              <YAxis stroke="#64748b" />
                              <Tooltip />
                              <Bar dataKey="value" name="Count" fill="#ef4444">
                                <LabelList dataKey="value" position="top" />
                              </Bar>
                              <Legend />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-400">
                            <div className="text-center">
                              <BarChart3 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                              <p>No incident data available</p>
                            </div>
                          </div>
                        )}
                        </div>
                        </CardContent>
                        </Card>
                        </div>
                        )}
                        </>
                        )}
                        </div>
                        );
                        };

                        export default ProjectAnalyticsDashboard;