// ProjectAnalyticsDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase'; // Adjust path as needed
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Adjust path
import { Badge } from '@/components/ui/badge'; // Adjust path
import { Users, AlertTriangle, Eye, Clock, CheckCircle, TrendingUp } from 'lucide-react'; // Adjust imports if needed
import { Incident } from '@/types'; // Import the proper Incident type

// --- Firebase-specific Incident type for this component ---
type FirebaseIncident = Incident & {
  id: string;
  createdAt: string;
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
  const [incidents, setIncidents] = useState<FirebaseIncident[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [acks, setAcks] = useState<Record<string, Ack[]>>({}); // Keyed by incident ID

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

  // --- Render ---
  return (
    <div className="space-y-8 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.length}</div>
            <p className="text-xs text-muted-foreground">Monitored emergencies</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Observations</CardTitle>
            <Eye className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{observations.length}</div>
            <p className="text-xs text-muted-foreground">Safety observations</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
            <Clock className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">To first acknowledgment</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Observation Closure Rate</CardTitle>
            <CheckCircle className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closureRate}</div>
            <p className="text-xs text-muted-foreground">Actions completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Analysis Chart */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-500" /> Incident & Observation Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="incidents" name="Incidents" stroke="#ef4444" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="observations" name="Observations" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type Breakdown - Observations */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Observation Type Distribution</CardTitle>
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
                    <Tooltip formatter={(value) => [`${value}`, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No observation data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Type Breakdown - Incidents */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Incident Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {incidentTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={incidentTypeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }} // Increased bottom margin for labels
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Count" fill="#ef4444">
                      <LabelList dataKey="value" position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No incident data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Heatmap Placeholder/List */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-orange-500" /> High-Risk Locations (by Report Count)</CardTitle>
        </CardHeader>
        <CardContent>
          {locationHeatmapData.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {locationHeatmapData.slice(0, 10).map((loc, index) => ( // Show top 10
                <div key={loc.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-medium">{index + 1}. {loc.name}</span>
                  <Badge variant="secondary">{loc.count} reports</Badge>
                  {/* In a full implementation, you would render a map marker or cluster here */}
                  {/* {loc.lat !== null && loc.lng !== null && <MapPinIcon className="h-4 w-4 text-muted-foreground" />} */}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No location data available for heatmap.</p>
          )}
          {/* Note: For a true heatmap, you would integrate with a mapping library like react-leaflet
              and plot markers/clusters based on lat/lng from locationHeatmapData */}
        </CardContent>
      </Card>

      {/* Team Performance & Compliance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Latest Muster Rate</span>
                <span className="font-bold">{musterRate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Team Size</span>
                <span className="font-bold">{teamMembers.length}</span>
              </div>
              {/* Add more team metrics here if available */}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Compliance Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Observation Closure Rate</span>
                <span className="font-bold">{closureRate}</span>
              </div>
              {/* Add more compliance metrics here */}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Estimated Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Potential Incidents Prevented</span>
                <span className="font-bold">N/A</span> {/* This would require complex modeling */}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Estimated ROI</span>
                <span className="font-bold">N/A</span> {/* This would require cost data and modeling */}
              </div>
              {/* Placeholder for future ROI/Impact calculations */}
              <p className="text-xs text-muted-foreground italic mt-2">
                Advanced analytics for cost savings and ROI estimation coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectAnalyticsDashboard;