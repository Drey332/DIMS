// ProjectAnalyticsDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Note: DatePickerWithRange would need to be implemented separately
import { 
  Users, AlertTriangle, Eye, Clock, CheckCircle, TrendingUp, 
  Download, FileText, MapPin, Award, Target, DollarSign,
  Filter, Calendar, BarChart3, PieChart as PieChartIcon,
  Activity, Shield, Timer, Zap
} from 'lucide-react';
import { Incident } from '@/types';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Firebase-specific types for this component ---
type FirebaseIncident = Incident & {
  id: string;
  createdAt: string;
  lat?: number;
  lng?: number;
};

type Observation = {
  id: string;
  type: string[];
  location: string;
  lat?: number | null; // Add optional location for heatmap
  lng?: number | null; // Add optional location for heatmap
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
  // ... other fields if needed
};

type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: "GOLD" | "SILVER" | "BRONZE" | string;
  title?: string;
  status?: string;
  // ... other fields
};

type Ack = {
  id: string;
  userId: string;
  acknowledgedAt: string;
  lat?: number | null;
  lng?: number | null;
  hasLocation?: boolean;
  // ... other fields
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const ProjectAnalyticsDashboard: React.FC<{ projectId: string }> = ({ projectId }) => {
  // --- Core Data State ---
  const [incidents, setIncidents] = useState<FirebaseIncident[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [acks, setAcks] = useState<Record<string, Ack[]>>({});

  // --- Filter State ---
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // --- Analytics Derived State ---
  const [selectedView, setSelectedView] = useState<'trends' | 'location' | 'performance' | 'compliance' | 'roi'>('trends');

  // --- Fetch Data ---
  useEffect(() => {
    if (!projectId) return;

    // Fetch Incidents
    const incidentsQuery = query(collection(db, "emergencies"), orderBy("createdAt"));
    const unsubIncidents = onSnapshot(incidentsQuery, (snapshot) => {
      const incidentList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseIncident));
      setIncidents(incidentList);
    });

    // Fetch Observations
    const observationsQuery = query(collection(db, "observations"), orderBy("createdAt"));
    const unsubObservations = onSnapshot(observationsQuery, (snapshot) => {
      const observationList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Observation));
      setObservations(observationList);
    });

    // Fetch Team Members
    const teamQuery = query(collection(db, "projects", projectId, "teamMembers"));
    const unsubTeam = onSnapshot(teamQuery, (snapshot) => {
      const teamList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
      setTeamMembers(teamList);
    });

    // Fetch Acks for all incidents (This could be optimized if you have many incidents)
    // For simplicity, we'll listen to acks for each incident. In a large app, consider batch fetching or limiting scope.
    const ackUnsubs: (() => void)[] = [];
    const handleIncidentsUpdate = () => {
        // Unsubscribe previous ack listeners
        ackUnsubs.forEach(unsub => unsub());
        ackUnsubs.length = 0; // Clear the array

        // Subscribe to acks for current incidents
        incidents.forEach(incident => {
            const ackQuery = query(collection(db, "emergencies", incident.id, "acks"));
            const unsubAck = onSnapshot(ackQuery, (ackSnapshot) => {
                 const ackList = ackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ack));
                 setAcks(prev => ({ ...prev, [incident.id]: ackList }));
            });
            ackUnsubs.push(unsubAck);
        });
    };

    // Run once initially and whenever incidents list changes
    handleIncidentsUpdate();

    // Cleanup listeners
    return () => {
      unsubIncidents();
      unsubObservations();
      unsubTeam();
      ackUnsubs.forEach(unsub => unsub());
    };
  }, [projectId, incidents]); // Add incidents as dependency to re-run ack subscription setup

  // --- Processed Data using useMemo ---

  // 1. Trend Analysis: Daily Counts
  const trendData = useMemo(() => {
    const dataMap: Record<string, { date: string; incidents: number; observations: number }> = {};

    // Process Incidents
    incidents.forEach(inc => {
        const dateStr = inc.createdAt ? new Date(inc.createdAt).toISOString().split('T')[0] : '';
        if (dateStr) {
            if (!dataMap[dateStr]) {
                dataMap[dateStr] = { date: dateStr, incidents: 0, observations: 0 };
            }
            dataMap[dateStr].incidents += 1;
        }
    });

    // Process Observations
    observations.forEach(obs => {
        const dateStr = obs.createdAt ? new Date(obs.createdAt).toISOString().split('T')[0] : '';
        if (dateStr) {
            if (!dataMap[dateStr]) {
                dataMap[dateStr] = { date: dateStr, incidents: 0, observations: 0 };
            }
            dataMap[dateStr].observations += 1;
        }
    });

    // Convert map to sorted array
    return Object.values(dataMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [incidents, observations]);

  // --- Advanced Analytics Functions ---
  
  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('HydroSafe Analytics Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Project: ${projectId}`, 20, 35);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
    
    // Add summary statistics
    doc.text('Summary Statistics:', 20, 65);
    doc.text(`Active Incidents: ${incidents.filter(i => i.status === 'ACTIVE').length}`, 30, 80);
    doc.text(`Total Observations: ${observations.length}`, 30, 90);
    doc.text(`Team Members: ${teamMembers.length}`, 30, 100);
    
    doc.save(`hydrosafe-analytics-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Incidents sheet
    const incidentsWS = XLSX.utils.json_to_sheet(incidents.map(inc => ({
      'ID': inc.id,
      'Title': inc.title,
      'Type': inc.type,
      'Priority': inc.priority,
      'Status': inc.status,
      'Start Time': inc.startTime,
      'Description': inc.description
    })));
    XLSX.utils.book_append_sheet(wb, incidentsWS, 'Incidents');
    
    // Observations sheet
    const observationsWS = XLSX.utils.json_to_sheet(observations.map(obs => ({
      'ID': obs.id,
      'Type': obs.type.join(', '),
      'Location': obs.location,
      'Vessel': obs.vessel,
      'System': obs.system,
      'Observation': obs.observation,
      'Status': obs.status,
      'Date': obs.date
    })));
    XLSX.utils.book_append_sheet(wb, observationsWS, 'Observations');
    
    XLSX.writeFile(wb, `hydrosafe-data-${projectId}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Calculate ROI metrics
  const roiMetrics = useMemo(() => {
    const activeIncidents = incidents.filter(i => i.status === 'ACTIVE').length;
    const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED').length;
    const preventedIncidents = Math.max(0, observations.length - activeIncidents);
    
    // Estimated cost savings (example calculation)
    const avgIncidentCost = 50000; // USD
    const estimatedSavings = preventedIncidents * avgIncidentCost * 0.3; // 30% prevention rate
    
    return {
      activeIncidents,
      resolvedIncidents,
      preventedIncidents,
      estimatedSavings,
      responseImprovement: resolvedIncidents > 0 ? (resolvedIncidents / incidents.length * 100) : 0
    };
  }, [incidents, observations]);

  // Response time analysis
  const responseTimeMetrics = useMemo(() => {
    const responseTimes: number[] = [];
    
    Object.entries(acks).forEach(([incidentId, ackList]) => {
      if (ackList.length > 0) {
        const incident = incidents.find(i => i.id === incidentId);
        if (incident?.startTime) {
          const startTime = new Date(incident.startTime).getTime();
          const firstAck = ackList.sort((a, b) => new Date(a.acknowledgedAt).getTime() - new Date(b.acknowledgedAt).getTime())[0];
          if (firstAck) {
            const ackTime = new Date(firstAck.acknowledgedAt).getTime();
            const responseTime = (ackTime - startTime) / 1000 / 60; // minutes
            responseTimes.push(responseTime);
          }
        }
      }
    });

    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    const medianResponseTime = responseTimes.length > 0 ? 
      responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)] : 0;

    return {
      average: avgResponseTime,
      median: medianResponseTime,
      fastest: Math.min(...responseTimes) || 0,
      slowest: Math.max(...responseTimes) || 0,
      total: responseTimes.length
    };
  }, [acks, incidents]);

  // Team performance metrics
  const teamPerformanceMetrics = useMemo(() => {
    const memberPerformance: Record<string, { 
      name: string; 
      role: string; 
      responses: number; 
      avgResponseTime: number; 
      totalIncidents: number 
    }> = {};

    Object.entries(acks).forEach(([incidentId, ackList]) => {
      ackList.forEach(ack => {
        const member = teamMembers.find(m => m.id === ack.userId);
        if (member) {
          if (!memberPerformance[ack.userId]) {
            memberPerformance[ack.userId] = {
              name: `${member.firstName} ${member.lastName}`,
              role: member.role,
              responses: 0,
              avgResponseTime: 0,
              totalIncidents: 0
            };
          }
          memberPerformance[ack.userId].responses++;
        }
      });
    });

    return Object.values(memberPerformance).sort((a, b) => b.responses - a.responses);
  }, [acks, teamMembers]);

  // 2. Type Breakdown
  const observationTypeData = useMemo(() => {
    const typeMap: Record<string, number> = {};
    observations.forEach(obs => {
        obs.type.forEach(t => {
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
    });
    return Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  }, [observations]);

  const incidentTypeData = useMemo(() => {
    const typeMap: Record<string, number> = {};
    incidents.forEach(inc => {
        const type = inc.type || 'Unknown';
        typeMap[type] = (typeMap[type] || 0) + 1;
    });
    return Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  // 3. Response Time Metrics (Average)
  const avgResponseTime = useMemo(() => {
    if (incidents.length === 0 || Object.keys(acks).length === 0) return "N/A";

    let totalResponseTimeMs = 0;
    let validIncidentCount = 0;

    incidents.forEach(inc => {
        const incidentStartTime = inc.startTime ? new Date(inc.startTime).getTime() : null;
        const incidentAcks = acks[inc.id] || [];

        if (incidentStartTime && incidentAcks.length > 0) {
            // Find the earliest ack for this incident
            const earliestAckTime = incidentAcks
                .map(ack => ack.acknowledgedAt ? new Date(ack.acknowledgedAt).getTime() : null)
                .filter(time => time !== null) as number[];

            if (earliestAckTime.length > 0) {
                const minAckTime = Math.min(...earliestAckTime);
                totalResponseTimeMs += (minAckTime - incidentStartTime);
                validIncidentCount += 1;
            }
        }
    });

    if (validIncidentCount === 0) return "N/A";

    const avgMs = totalResponseTimeMs / validIncidentCount;
    // Convert to minutes and seconds for display
    const minutes = Math.floor(avgMs / 60000);
    const seconds = Math.floor((avgMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }, [incidents, acks]);

  // 4. Closure Rate
  const closureRate = useMemo(() => {
    if (observations.length === 0) return "N/A";
    const closedCount = observations.filter(obs => obs.status === "CLOSED").length;
    return `${Math.round((closedCount / observations.length) * 100)}%`;
  }, [observations]);

  // 5. Team Performance: Muster Rate (Simplified - based on acks for latest active incident)
  // This is a simplified version. A full analysis would require tracking acks per incident over time.
  const musterRate = useMemo(() => {
    if (incidents.length === 0 || teamMembers.length === 0 || Object.keys(acks).length === 0) return "N/A";

    // Find the latest active incident or the most recent one
    const latestIncident = [...incidents]
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];

    if (!latestIncident) return "N/A";

    const latestAcks = acks[latestIncident.id] || [];
    const ackedUserIds = new Set(latestAcks.map(ack => ack.userId));
    const musterCount = teamMembers.filter(tm => ackedUserIds.has(tm.id)).length;

    return `${Math.round((musterCount / teamMembers.length) * 100)}%`;
  }, [incidents, teamMembers, acks]);

  // 6. Location Heatmap Data (Prepare data points)
  // This prepares data for a potential map component. For now, we'll show a list of locations with counts.
  const locationHeatmapData = useMemo(() => {
    const locMap: Record<string, { name: string; count: number; lat: number | null; lng: number | null }> = {};

    // Combine locations from incidents (if stored) and observations
    // Assuming observations primarily have the location field for heatmap
    observations.forEach(obs => {
        const locName = obs.location || 'Unknown Location';
        if (!locMap[locName]) {
            locMap[locName] = { name: locName, count: 0, lat: obs.lat || null, lng: obs.lng || null };
        }
        locMap[locName].count += 1;
    });

    // Sort by count descending
    return Object.values(locMap).sort((a, b) => b.count - a.count);
  }, [observations]);

  // --- Render Component ---
  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-7xl mx-auto glassy-bg">
      {/* Header with Export Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold neon-text">HydroSafe Analytics Dashboard</h1>
          <p className="text-gray-300 mt-1">Real-time safety intelligence and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} className="bg-blue-500 hover:bg-blue-600 neon-border">
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={exportToExcel} className="bg-green-500 hover:bg-green-600 neon-border">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Advanced Filter Controls */}
      <Card className="glassy-card neon-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-cyan-400" />
            Advanced Filters & Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Timeframe</label>
              <Select value={timeframe} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setTimeframe(value)}>
                <SelectTrigger className="glassy-bg neon-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Type Filter</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="glassy-bg neon-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="MEDICAL">Medical</SelectItem>
                  <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                  <SelectItem value="WEATHER">Weather</SelectItem>
                  <SelectItem value="OPERATIONAL">Operational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="glassy-bg neon-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="ESCALATED">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Team Filter</label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="glassy-bg neon-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="GOLD">Gold Command</SelectItem>
                  <SelectItem value="SILVER">Silver Command</SelectItem>
                  <SelectItem value="BRONZE">Bronze Command</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: 'trends', label: 'Trend Analysis', icon: TrendingUp },
          { key: 'location', label: 'Location Heatmap', icon: MapPin },
          { key: 'performance', label: 'Team Performance', icon: Users },
          { key: 'compliance', label: 'Compliance', icon: Shield },
          { key: 'roi', label: 'ROI Analysis', icon: DollarSign }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            onClick={() => setSelectedView(key as any)}
            variant={selectedView === key ? "default" : "outline"}
            className={`${selectedView === key ? 'neon-border animate-glow' : 'glassy-bg'} whitespace-nowrap`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </Button>
        ))}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glassy-card neon-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Incidents</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold neon-text">{incidents.length}</div>
            <p className="text-xs text-gray-400">Monitored emergencies</p>
          </CardContent>
        </Card>
        <Card className="glassy-card neon-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Observations</CardTitle>
            <Eye className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold neon-text">{observations.length}</div>
            <p className="text-xs text-gray-400">Safety observations</p>
          </CardContent>
        </Card>
        <Card className="glassy-card neon-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg. Response Time</CardTitle>
            <Clock className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold neon-text">{responseTimeMetrics.average.toFixed(1)}m</div>
            <p className="text-xs text-gray-400">To first acknowledgment</p>
          </CardContent>
        </Card>
        <Card className="glassy-card neon-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Closure Rate</CardTitle>
            <CheckCircle className="h-5 w-5 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold neon-text">{closureRate}</div>
            <p className="text-xs text-gray-400">Actions completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Conditional Content Based on Selected View */}
      {selectedView === 'trends' && (
        <div className="space-y-6">
          {/* Trend Analysis Chart */}
          <Card className="glassy-card neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 neon-text">
                <TrendingUp className="h-5 w-5 text-cyan-400" /> 
                Incident & Observation Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorObservations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid #06b6d4',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="incidents" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#colorIncidents)"
                      name="Incidents"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="observations" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorObservations)"
                      name="Observations"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'location' && (
        <div className="space-y-6">
          {/* Location Heatmap */}
          <Card className="glassy-card neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 neon-text">
                <MapPin className="h-5 w-5 text-green-400" />
                Location Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Hotspots List */}
                <div>
                  <h4 className="font-semibold mb-4 text-gray-300">High-Risk Locations</h4>
                  {locationHeatmapData.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {locationHeatmapData.slice(0, 10).map((loc, index) => (
                        <div key={loc.name} className="flex items-center justify-between p-3 glassy-bg rounded-lg neon-border">
                          <span className="font-medium text-gray-300">{index + 1}. {loc.name}</span>
                          <Badge variant="secondary" className="neon-border">
                            {loc.count} reports
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No location data available.</p>
                  )}
                </div>
                
                {/* Interactive Map Placeholder */}
                <div className="h-96 glassy-bg rounded-lg neon-border flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <MapPin className="h-16 w-16 mx-auto mb-4 text-cyan-400" />
                    <p>Interactive Map</p>
                    <p className="text-sm">Real-time location tracking</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'performance' && (
        <div className="space-y-6">
          {/* Team Performance Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glassy-card neon-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 neon-text">
                  <Users className="h-5 w-5 text-blue-400" />
                  Team Response Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamPerformanceMetrics.map((member, index) => (
                    <div key={member.name} className="flex items-center justify-between p-3 glassy-bg rounded-lg">
                      <div>
                        <div className="font-medium text-gray-300">{member.name}</div>
                        <div className="text-sm text-gray-400">{member.role}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-cyan-400">{member.responses}</div>
                        <div className="text-xs text-gray-400">responses</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glassy-card neon-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 neon-text">
                  <Timer className="h-5 w-5 text-purple-400" />
                  Response Time Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 glassy-bg rounded-lg">
                    <div className="text-2xl font-bold text-cyan-400">
                      {responseTimeMetrics.fastest.toFixed(1)}m
                    </div>
                    <div className="text-sm text-gray-400">Fastest</div>
                  </div>
                  <div className="text-center p-3 glassy-bg rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">
                      {responseTimeMetrics.average.toFixed(1)}m
                    </div>
                    <div className="text-sm text-gray-400">Average</div>
                  </div>
                  <div className="text-center p-3 glassy-bg rounded-lg">
                    <div className="text-2xl font-bold text-yellow-400">
                      {responseTimeMetrics.median.toFixed(1)}m
                    </div>
                    <div className="text-sm text-gray-400">Median</div>
                  </div>
                  <div className="text-center p-3 glassy-bg rounded-lg">
                    <div className="text-2xl font-bold text-red-400">
                      {responseTimeMetrics.slowest.toFixed(1)}m
                    </div>
                    <div className="text-sm text-gray-400">Slowest</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedView === 'compliance' && (
        <div className="space-y-6">
          {/* Compliance Dashboard */}
          <Card className="glassy-card neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 neon-text">
                <Shield className="h-5 w-5 text-green-400" />
                Compliance & Safety Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 glassy-bg rounded-lg">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {Math.round((incidents.filter(i => i.status === 'RESOLVED').length / Math.max(incidents.length, 1)) * 100)}%
                  </div>
                  <div className="text-sm text-gray-400">Incident Resolution Rate</div>
                </div>
                <div className="text-center p-4 glassy-bg rounded-lg">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {Math.round((observations.filter(o => o.status === 'CLOSED').length / Math.max(observations.length, 1)) * 100)}%
                  </div>
                  <div className="text-sm text-gray-400">Observation Closure Rate</div>
                </div>
                <div className="text-center p-4 glassy-bg rounded-lg">
                  <div className="text-3xl font-bold text-purple-400 mb-2">
                    {responseTimeMetrics.total}
                  </div>
                  <div className="text-sm text-gray-400">Total Responses</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'roi' && (
        <div className="space-y-6">
          {/* ROI Analysis */}
          <Card className="glassy-card neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 neon-text">
                <DollarSign className="h-5 w-5 text-yellow-400" />
                ROI & Cost Savings Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 glassy-bg rounded-lg neon-border">
                  <div className="text-2xl font-bold text-green-400 mb-2">
                    ${roiMetrics.estimatedSavings.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Estimated Savings</div>
                </div>
                <div className="text-center p-4 glassy-bg rounded-lg neon-border">
                  <div className="text-2xl font-bold text-blue-400 mb-2">
                    {roiMetrics.preventedIncidents}
                  </div>
                  <div className="text-sm text-gray-400">Prevented Incidents</div>
                </div>
                <div className="text-center p-4 glassy-bg rounded-lg neon-border">
                  <div className="text-2xl font-bold text-purple-400 mb-2">
                    {roiMetrics.responseImprovement.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">Response Improvement</div>
                </div>
                <div className="text-center p-4 glassy-bg rounded-lg neon-border">
                  <div className="text-2xl font-bold text-cyan-400 mb-2">
                    {Math.round(roiMetrics.estimatedSavings / 50000 * 100)}%
                  </div>
                  <div className="text-sm text-gray-400">ROI Efficiency</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Analytics Charts for All Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type Breakdown - Observations */}
        <Card className="glassy-card neon-border">
          <CardHeader>
            <CardTitle className="neon-text">Observation Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {observationTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={observationTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {observationTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value}`, 'Count']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid #06b6d4',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <PieChartIcon className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                    <p>No observation data available</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Type Breakdown - Incidents */}
        <Card className="glassy-card neon-border">
          <CardHeader>
            <CardTitle className="neon-text">Incident Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {incidentTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={incidentTypeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid #06b6d4',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" name="Count" fill="#ef4444">
                      <LabelList dataKey="value" position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                    <p>No incident data available</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectAnalyticsDashboard;