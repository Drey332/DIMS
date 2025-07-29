import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "../firebase";
import { Header } from "@/components/header";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Clock, MapPin, Trash2, Eye, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AlarmData {
  id: string;
  triggeredAt: number;
  message: string;
  status?: "active" | "resolved" | "cancelled";
  resolvedAt?: number;
  totalAcknowledged?: number;
  activeUsers?: string[];
}

interface AckData {
  userId: string;
  name: string;
  photoURL: string;
  gps?: { lat: number; lng: number };
  time: number;
}

export default function EmergencyAdminPanel() {
  const { toast } = useToast();
  const [alarms, setAlarms] = useState<AlarmData[]>([]);
  const [selectedAlarm, setSelectedAlarm] = useState<string | null>(null);
  const [alarmAcks, setAlarmAcks] = useState<AckData[]>([]);
  const [loading, setLoading] = useState(true);

  // --- TRIGGER NEW ALARM ---
  const triggerNewAlarm = async () => {
    const newId = uuidv4();
    try {
      await setDoc(doc(db, "alarms", newId), {
        triggeredAt: Date.now(),
        message: "EMERGENCY: Muster required. Confirm your safety now!",
        status: "active",
      });
      toast({ title: "New emergency alarm triggered!" });
      setSelectedAlarm(newId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast({ title: "Error creating alarm", description: err.message, variant: "destructive" });
    }
  };

  // --- Load all alarms ---
  useEffect(() => {
    const alarmsQuery = query(collection(db, "alarms"), orderBy("triggeredAt", "desc"));
    const unsubscribe = onSnapshot(alarmsQuery, (snapshot) => {
      const alarmsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || "active"
      })) as AlarmData[];
      setAlarms(alarmsData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // --- Load acknowledgments for selected alarm ---
  useEffect(() => {
    if (!selectedAlarm) {
      setAlarmAcks([]);
      return;
    }

    const acksQuery = collection(db, "alarms", selectedAlarm, "acks");
    const unsubscribe = onSnapshot(acksQuery, (snapshot) => {
      const acksData = snapshot.docs.map(doc => doc.data()) as AckData[];
      setAlarmAcks(acksData.sort((a, b) => a.name.localeCompare(b.name)));
    });

    return unsubscribe;
  }, [selectedAlarm]);

  const resolveAlarm = async (alarmId: string) => {
    try {
      await updateDoc(doc(db, "alarms", alarmId), {
        status: "resolved",
        resolvedAt: Date.now()
      });
      toast({ title: "Alarm resolved successfully" });
    } catch (error) {
      toast({ title: "Error resolving alarm", variant: "destructive" });
    }
  };

  const cancelAlarm = async (alarmId: string) => {
    try {
      await updateDoc(doc(db, "alarms", alarmId), {
        status: "cancelled",
        resolvedAt: Date.now()
      });
      toast({ title: "Alarm cancelled successfully" });
    } catch (error) {
      toast({ title: "Error cancelling alarm", variant: "destructive" });
    }
  };

  const deleteAlarm = async (alarmId: string) => {
    if (!confirm("Are you sure you want to permanently delete this alarm? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "alarms", alarmId));
      toast({ title: "Alarm deleted successfully" });
      if (selectedAlarm === alarmId) {
        setSelectedAlarm(null);
      }
    } catch (error) {
      toast({ title: "Error deleting alarm", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Active</Badge>;
      case "resolved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Resolved</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Cancelled</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Unknown</Badge>;
    }
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const calculateDuration = (start: number, end?: number) => {
    const duration = (end || Date.now()) - start;
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Emergency Admin Panel</h1>
          <p className="text-gray-600">Monitor and manage emergency alarms and muster responses</p>
        </div>

        {/* --- TRIGGER NEW ALARM BUTTON --- */}
        <div className="flex gap-3 mb-6">
          <Button
            className="bg-red-600 text-white font-bold px-6 py-3 rounded-lg shadow hover:bg-red-700"
            onClick={triggerNewAlarm}
          >
            🚨 Trigger New Emergency Alarm
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Alarms List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                Emergency Alarms ({alarms.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {alarms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No emergency alarms found
                  </div>
                ) : (
                  alarms.map((alarm) => (
                    <div
                      key={alarm.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAlarm === alarm.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedAlarm(alarm.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(alarm.status || "active")}
                          <span className="text-sm text-gray-500">
                            {alarm.id.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAlarm(alarm.id);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {alarm.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resolveAlarm(alarm.id);
                                }}
                              >
                                Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-yellow-600 hover:text-yellow-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelAlarm(alarm.id);
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAlarm(alarm.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 mb-2">
                        {alarm.message}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDateTime(alarm.triggeredAt)}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          Duration: {calculateDuration(alarm.triggeredAt, alarm.resolvedAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alarm Details & Acknowledgments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                {selectedAlarm ? 'Muster Responses' : 'Select an Alarm'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedAlarm ? (
                <div className="text-center py-8 text-gray-500">
                  Select an alarm from the list to view acknowledgments and responses
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Alarm ID: {selectedAlarm.slice(0, 8)}...
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {alarmAcks.length} People Acknowledged
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {alarmAcks.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No acknowledgments yet
                      </div>
                    ) : (
                      alarmAcks.map((ack) => (
                        <div
                          key={ack.userId}
                          className="flex items-center space-x-3 p-3 bg-white border rounded-lg"
                        >
                          <img
                            src={ack.photoURL || "/avatar.png"}
                            alt={ack.name}
                            className="w-10 h-10 rounded-full border"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {ack.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDateTime(ack.time)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {ack.gps ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                GPS
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                No Location
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {alarms.filter(a => a.status === "active").length}
              </div>
              <div className="text-sm text-gray-600">Active Alarms</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {alarms.filter(a => a.status === "resolved").length}
              </div>
              <div className="text-sm text-gray-600">Resolved Alarms</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {alarmAcks.length}
              </div>
              <div className="text-sm text-gray-600">Total Responses</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {alarmAcks.filter(a => a.gps).length}
              </div>
              <div className="text-sm text-gray-600">With GPS Location</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}