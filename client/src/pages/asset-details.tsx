import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, ArrowLeft, Edit, Camera, Clock, User, Wrench, AlertTriangle, CheckCircle, Calendar, Eye, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Asset {
  id: string;
  name: string;
  category: string;
  modelSerial: string;
  manufacturer: string;
  year: string;
  condition: string;
  assignedTo: string;
  specs?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  location?: string;
}

interface MaintenanceRecord {
  id: string;
  assetId: string;
  type: string;
  description: string;
  performedBy: string;
  date: string;
  status: string;
  cost?: number;
  photos?: string[];
  notes?: string;
}

interface InspectionRecord {
  id: string;
  assetId: string;
  inspector: string;
  date: string;
  condition: string;
  findings: string;
  photos?: string[];
  recommendations?: string;
}

export default function AssetDetails() {
  const { id } = useParams();
  const [location, setLocation] = useLocation();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [inspectionRecords, setInspectionRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'inspections' | 'edit'>('overview');
  const [editMode, setEditMode] = useState(false);
  const [editedAsset, setEditedAsset] = useState<Asset | null>(null);

  const projectId = "hydrosafe-5d245"; // Use your actual project ID logic here

  // Fetch asset data
  useEffect(() => {
    if (!id) return;

    const fetchAsset = async () => {
      try {
        const assetDoc = await getDoc(doc(db, "projects", projectId, "assetsAndEquipment", id));
        if (assetDoc.exists()) {
          const assetData = { id: assetDoc.id, ...assetDoc.data() } as Asset;
          setAsset(assetData);
          setEditedAsset(assetData);
        } else {
          setError("Asset not found");
        }
      } catch (err) {
        console.error("Error fetching asset:", err);
        setError("Failed to load asset");
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();

    // Listen for maintenance records
    const maintenanceQuery = query(
      collection(db, "projects", projectId, "maintenance"),
      orderBy("date", "desc")
    );
    const unsubMaintenance = onSnapshot(maintenanceQuery, (snapshot) => {
      const records = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRecord))
        .filter(record => record.assetId === id);
      setMaintenanceRecords(records);
    });

    // Listen for inspection records
    const inspectionQuery = query(
      collection(db, "projects", projectId, "inspections"),
      orderBy("date", "desc")
    );
    const unsubInspections = onSnapshot(inspectionQuery, (snapshot) => {
      const records = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as InspectionRecord))
        .filter(record => record.assetId === id);
      setInspectionRecords(records);
    });

    return () => {
      unsubMaintenance();
      unsubInspections();
    };
  }, [id, projectId]);

  const getStatusBadge = (condition: string) => {
    switch (condition) {
      case "Needs Repair":
        return "bg-red-100 text-red-700 border-red-300";
      case "Fair":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Good":
        return "bg-green-100 text-green-700 border-green-300";
      case "New":
        return "bg-blue-100 text-blue-700 border-blue-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleSaveAsset = async () => {
    if (!editedAsset || !id) return;

    try {
      const assetRef = doc(db, "projects", projectId, "assetsAndEquipment", id);
      await updateDoc(assetRef, {
        ...editedAsset,
        updatedAt: new Date().toISOString(),
      });
      setAsset(editedAsset);
      setEditMode(false);
    } catch (err) {
      console.error("Error updating asset:", err);
      setError("Failed to update asset");
    }
  };

  const addMaintenanceRecord = async (type: string, description: string) => {
    if (!id) return;

    try {
      await addDoc(collection(db, "projects", projectId, "maintenance"), {
        assetId: id,
        type,
        description,
        performedBy: "Current User", // Replace with actual user
        date: new Date().toISOString(),
        status: "Completed",
      });
    } catch (err) {
      console.error("Error adding maintenance record:", err);
    }
  };

  const addInspectionRecord = async (condition: string, findings: string) => {
    if (!id) return;

    try {
      await addDoc(collection(db, "projects", projectId, "inspections"), {
        assetId: id,
        inspector: "Current User", // Replace with actual user
        date: new Date().toISOString(),
        condition,
        findings,
      });
    } catch (err) {
      console.error("Error adding inspection record:", err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading asset details...</div>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-red-700 mb-2">Asset Not Found</h3>
            <p className="text-gray-600 text-center mb-4">
              {error || "The requested asset could not be found."}
            </p>
            <Button onClick={() => setLocation("/asset-management")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/asset-management")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assets
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-[#045cff] flex items-center gap-2">
            <Package className="w-8 h-8" />
            {asset.name}
          </h1>
          <p className="text-gray-600">
            {asset.category} • {asset.modelSerial} • {asset.manufacturer}
          </p>
        </div>
        <Badge className={cn("px-3 py-1 text-base font-semibold border", getStatusBadge(asset.condition))}>
          {asset.condition}
        </Badge>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {[
          { key: 'overview', label: 'Overview', icon: Eye },
          { key: 'maintenance', label: 'Maintenance', icon: Wrench },
          { key: 'inspections', label: 'Inspections', icon: CheckCircle },
          { key: 'edit', label: 'Edit', icon: Edit },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? "default" : "ghost"}
            onClick={() => setActiveTab(key as any)}
            className="flex items-center gap-2"
          >
            <Icon className="w-4 h-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Category</label>
                  <p className="text-lg">{asset.category}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Model/Serial</label>
                  <p className="text-lg font-mono">{asset.modelSerial}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Manufacturer</label>
                  <p className="text-lg">{asset.manufacturer}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Year</label>
                  <p className="text-lg">{asset.year}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Assigned To</label>
                  <p className="text-lg">{asset.assignedTo || "Unassigned"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Location</label>
                  <p className="text-lg">{asset.location || "Not specified"}</p>
                </div>
              </div>
              {asset.specs && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Specifications</label>
                  <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">{asset.specs}</p>
                </div>
              )}
              {asset.notes && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Notes</label>
                  <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">{asset.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {maintenanceRecords.slice(0, 3).map((record) => (
                  <div key={record.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                    <Wrench className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-semibold">{record.type}</p>
                      <p className="text-sm text-gray-600">{record.description}</p>
                      <p className="text-xs text-gray-500">{new Date(record.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {inspectionRecords.slice(0, 3).map((record) => (
                  <div key={record.id} className="flex items-center gap-3 p-3 bg-green-50 rounded">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-semibold">Inspection - {record.condition}</p>
                      <p className="text-sm text-gray-600">{record.findings}</p>
                      <p className="text-xs text-gray-500">{new Date(record.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {maintenanceRecords.length === 0 && inspectionRecords.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {maintenanceRecords.map((record) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{record.type}</h3>
                    <span className="text-sm text-gray-500">{new Date(record.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-700 mb-2">{record.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Performed by: {record.performedBy}</span>
                    <span>Status: {record.status}</span>
                    {record.cost && <span>Cost: ${record.cost}</span>}
                  </div>
                </div>
              ))}
              {maintenanceRecords.length === 0 && (
                <p className="text-gray-500 text-center py-8">No maintenance records found</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'inspections' && (
        <Card>
          <CardHeader>
            <CardTitle>Inspection Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inspectionRecords.map((record) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">Inspection by {record.inspector}</h3>
                    <span className="text-sm text-gray-500">{new Date(record.date).toLocaleDateString()}</span>
                  </div>
                  <div className="mb-2">
                    <Badge className={getStatusBadge(record.condition)}>
                      {record.condition}
                    </Badge>
                  </div>
                  <p className="text-gray-700 mb-2">{record.findings}</p>
                  {record.recommendations && (
                    <div className="bg-yellow-50 p-3 rounded">
                      <strong>Recommendations:</strong> {record.recommendations}
                    </div>
                  )}
                </div>
              ))}
              {inspectionRecords.length === 0 && (
                <p className="text-gray-500 text-center py-8">No inspection records found</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'edit' && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Asset</CardTitle>
          </CardHeader>
          <CardContent>
            {editedAsset && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Asset Name</label>
                    <Input
                      value={editedAsset.name}
                      onChange={(e) => setEditedAsset({ ...editedAsset, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Category</label>
                    <Input
                      value={editedAsset.category}
                      onChange={(e) => setEditedAsset({ ...editedAsset, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Model/Serial</label>
                    <Input
                      value={editedAsset.modelSerial}
                      onChange={(e) => setEditedAsset({ ...editedAsset, modelSerial: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Manufacturer</label>
                    <Input
                      value={editedAsset.manufacturer}
                      onChange={(e) => setEditedAsset({ ...editedAsset, manufacturer: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Year</label>
                    <Input
                      value={editedAsset.year}
                      onChange={(e) => setEditedAsset({ ...editedAsset, year: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Condition</label>
                    <Select 
                      value={editedAsset.condition} 
                      onValueChange={(value) => setEditedAsset({ ...editedAsset, condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Assigned To</label>
                    <Input
                      value={editedAsset.assignedTo}
                      onChange={(e) => setEditedAsset({ ...editedAsset, assignedTo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Location</label>
                    <Input
                      value={editedAsset.location || ""}
                      onChange={(e) => setEditedAsset({ ...editedAsset, location: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Specifications</label>
                  <Textarea
                    value={editedAsset.specs || ""}
                    onChange={(e) => setEditedAsset({ ...editedAsset, specs: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Notes</label>
                  <Textarea
                    value={editedAsset.notes || ""}
                    onChange={(e) => setEditedAsset({ ...editedAsset, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSaveAsset} className="bg-[#045cff] hover:bg-blue-700">
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditedAsset(asset);
                      setEditMode(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}