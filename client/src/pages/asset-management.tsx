import React, { useEffect, useState } from "react";
import {
  collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy
} from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Plus, Package, Filter, QrCode, Paperclip, AlertTriangle, ClipboardCheck, CheckCircle, Upload } from "lucide-react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { cn } from "@/lib/utils";

// --- Asset Interface ---
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
}

// --- Maintenance, Issue, Task, Attachment Types ---
interface Maintenance {
  id: string;
  type: string;
  date: string;
  description: string;
  cost?: number;
  addedBy?: string;
}
interface Issue {
  id: string;
  description: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  resolvedAt?: string;
  reportedBy?: string;
  resolvedBy?: string;
}
interface Task {
  id: string;
  description: string;
  dueDate: string;
  assignedTo: string;
  completed: boolean;
}
interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export default function AssetManagement() {
  // --- State ---
  const urlParams = new URLSearchParams(window.location.search);
  const targetAssetId = urlParams.get('asset');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showQR, setShowQR] = useState<{ open: boolean; asset: Asset | null }>({ open: false, asset: null });
  const [highlightedAssetId, setHighlightedAssetId] = useState<string | null>(targetAssetId);

  // Modal & Inline States
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Input states for new entries
  const [newMaintenance, setNewMaintenance] = useState({ type: "Inspection", date: "", description: "", cost: "", addedBy: "" });
  const [newIssue, setNewIssue] = useState({ description: "" });
  const [newTask, setNewTask] = useState({ description: "", dueDate: "", assignedTo: "" });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // --- PROJECT ID ---
  const projectId = "1";

  // --- Firestore Subscriptions ---
  useEffect(() => {
    const q = query(collection(db, "projects", projectId, "assets"));
    const unsub = onSnapshot(q, (snap) => {
      const assetData = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Asset));
      setAssets(assetData);
      if (targetAssetId && assetData.length > 0) {
        const targetAsset = assetData.find(asset => asset.id === targetAssetId);
        if (targetAsset) {
          setSelectedAsset(targetAsset);
          setTimeout(() => {
            const element = document.getElementById(`asset-${targetAssetId}`);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    });
    return unsub;
  }, [projectId, targetAssetId]);

  // --- Fetch Subcollection Data (maintenance/issues/tasks/attachments) ---
  useEffect(() => {
    if (!selectedAsset) return;
    // --- Maintenance ---
    const qMaint = query(collection(db, "projects", projectId, "assets", selectedAsset.id, "maintenance"), orderBy("date", "desc"));
    const unsubMaint = onSnapshot(qMaint, snap => {
      setMaintenance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Maintenance)));
    });
    // --- Issues ---
    const qIssues = query(collection(db, "projects", projectId, "assets", selectedAsset.id, "issues"), orderBy("createdAt", "desc"));
    const unsubIssues = onSnapshot(qIssues, snap => {
      setIssues(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue)));
    });
    // --- Tasks ---
    const qTasks = query(collection(db, "projects", projectId, "assets", selectedAsset.id, "tasks"), orderBy("dueDate", "asc"));
    const unsubTasks = onSnapshot(qTasks, snap => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });
    // --- Attachments ---
    const qAttach = query(collection(db, "projects", projectId, "assets", selectedAsset.id, "attachments"), orderBy("uploadedAt", "desc"));
    const unsubAttach = onSnapshot(qAttach, snap => {
      setAttachments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attachment)));
    });

    return () => { unsubMaint(); unsubIssues(); unsubTasks(); unsubAttach(); };
  }, [selectedAsset]);

  // --- Filtering ---
  const filteredAssets = assets.filter((asset) => {
    const match =
      asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.modelSerial?.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch =
      statusFilter === "ALL" || asset.condition?.toUpperCase() === statusFilter;
    return match && statusMatch;
  });

  // --- Status badge ---
  const getStatusBadge = (condition: string) => {
    switch (condition) {
      case "Needs Repair": return "bg-red-100 text-red-700 border-red-300";
      case "Fair": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Good": return "bg-green-100 text-green-700 border-green-300";
      case "New": return "bg-blue-100 text-blue-700 border-blue-300";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // --- Add New Maintenance Entry ---
  const handleAddMaintenance = async () => {
    if (!selectedAsset) return;
    await addDoc(collection(db, "projects", projectId, "assets", selectedAsset.id, "maintenance"), {
      ...newMaintenance,
      cost: parseFloat(newMaintenance.cost || "0"),
      date: newMaintenance.date || new Date().toISOString(),
      addedBy: newMaintenance.addedBy || "You",
      createdAt: serverTimestamp(),
    });
    setNewMaintenance({ type: "Inspection", date: "", description: "", cost: "", addedBy: "" });
  };

  // --- Add New Issue ---
  const handleAddIssue = async () => {
    if (!selectedAsset || !newIssue.description.trim()) return;
    await addDoc(collection(db, "projects", projectId, "assets", selectedAsset.id, "issues"), {
      description: newIssue.description,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      reportedBy: "You",
    });
    setNewIssue({ description: "" });
  };

  // --- Close Issue ---
  const handleCloseIssue = async (issueId: string) => {
    if (!selectedAsset) return;
    await updateDoc(doc(db, "projects", projectId, "assets", selectedAsset.id, "issues", issueId), {
      status: "CLOSED",
      resolvedAt: new Date().toISOString(),
      resolvedBy: "You",
    });
  };

  // --- Add New Task ---
  const handleAddTask = async () => {
    if (!selectedAsset || !newTask.description.trim()) return;
    await addDoc(collection(db, "projects", projectId, "assets", selectedAsset.id, "tasks"), {
      ...newTask,
      completed: false,
    });
    setNewTask({ description: "", dueDate: "", assignedTo: "" });
  };

  // --- Complete Task ---
  const handleCompleteTask = async (taskId: string) => {
    if (!selectedAsset) return;
    await updateDoc(doc(db, "projects", projectId, "assets", selectedAsset.id, "tasks", taskId), {
      completed: true,
    });
  };

  // --- Upload Attachment (PDF/Image/Audio/Doc) ---
  const handleUploadAttachment = async () => {
    if (!uploadFile || !selectedAsset) return;
    // Replace below with your own upload logic (Firebase Storage recommended)
    // For demo, we'll pretend and just create a dummy doc with file name/type.
    await addDoc(collection(db, "projects", projectId, "assets", selectedAsset.id, "attachments"), {
      name: uploadFile.name,
      type: uploadFile.type,
      url: "https://dummyurl.com/" + uploadFile.name, // Replace with actual storage URL
      uploadedAt: new Date().toISOString(),
      uploadedBy: "You"
    });
    setUploadFile(null);
  };

  // --- UI ---
  return (
    <main>
      <div className="container mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-[#045cff] mb-2 tracking-tight flex items-center gap-2">
              <Package className="inline-block w-8 h-8 mb-1 text-[#045cff]" />
              Asset Management
            </h1>
            <p className="text-gray-500 text-lg">
              Monitor, manage, and future-proof all critical assets.
            </p>
          </div>
          <div className="flex gap-3">
            <Input
              className="rounded-lg border-2 border-[#045cff] focus:border-blue-700 shadow-sm px-4 py-2 text-lg"
              placeholder="Search by name, serial, or category..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-lg border-[#045cff] w-40 text-base">
                <Filter className="w-5 h-5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Needs Repair">Needs Repair</SelectItem>
              </SelectContent>
            </Select>
            {/* --- Add Asset Button (only for admins/managers) --- */}
            <Button className="bg-[#045cff] hover:bg-blue-700 text-white rounded-lg px-5 py-2 font-bold shadow transition" disabled>
              <Plus className="w-5 h-5 mr-2" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* ASSET GRID */}
        {filteredAssets.length === 0 ? (
          <Card className="mt-10 shadow-md border-blue-100">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Package className="h-16 w-16 text-blue-200 mb-6" />
              <h3 className="text-2xl font-bold text-blue-800 mb-2">No assets found</h3>
              <p className="text-gray-500 text-center mb-4">
                Start by adding assets and equipment. All your critical gear in one place.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAssets.map(asset => (
              <Card
                key={asset.id}
                id={`asset-${asset.id}`}
                className={cn(
                  "rounded-2xl p-0 overflow-hidden shadow-xl transition-transform hover:scale-105 group",
                  "bg-gradient-to-tr from-[#f8faff] via-white to-[#e8f2fd]",
                  highlightedAssetId === asset.id && "ring-4 ring-yellow-400 ring-opacity-75 shadow-2xl scale-105"
                )}
              >
                <CardHeader className="pb-3 bg-[#045cff]/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-extrabold text-[#102347] text-xl">
                      {asset.name}
                    </CardTitle>
                    <Badge className={cn("px-3 py-1 text-base font-semibold border", getStatusBadge(asset.condition))}>
                      {asset.condition}
                    </Badge>
                  </div>
                  <div className="text-gray-600 text-sm mt-2">
                    <span className="font-bold">{asset.category}</span>
                    {asset.modelSerial && (
                      <> • <span className="font-mono">{asset.modelSerial}</span></>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-gray-600">{asset.manufacturer} ({asset.year})</span>
                    {asset.assignedTo && (
                      <span className="ml-2 text-blue-800 font-semibold">
                        Assigned: {asset.assignedTo}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 mb-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg font-bold"
                      onClick={() => setShowQR({ open: true, asset })}
                    >
                      <QrCode className="w-5 h-5 mr-1" /> QR
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg font-bold"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <Eye className="w-5 h-5 mr-1" /> Open
                    </Button>
                  </div>
                  {asset.specs && (
                    <div className="text-xs text-gray-700 mt-2 whitespace-pre-wrap">
                      <b>Specs:</b> {asset.specs}
                    </div>
                  )}
                  {asset.notes && (
                    <div className="text-xs text-gray-500 mt-1">
                      <b>Notes:</b> {asset.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* --- QR Modal --- */}
        {showQR.open && showQR.asset && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
              <h2 className="text-xl font-bold mb-3">
                QR Code for: {showQR.asset.name}
              </h2>
              <QRCode value={`${window.location.origin}/asset-management?asset=${showQR.asset.id}`} size={220} />
              <div className="mt-4 text-center text-sm text-gray-600">
                <p>Scan to open asset in HydroSafe</p>
                <p className="font-mono text-xs">{showQR.asset.id}</p>
              </div>
              <Button
                className="mt-6 bg-[#045cff] text-white px-7"
                onClick={() => setShowQR({ open: false, asset: null })}
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {/* --- Asset Detail Modal --- */}
        {selectedAsset && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-7 flex flex-col items-stretch overflow-y-auto" style={{ maxHeight: "92vh" }}>
              <h2 className="text-2xl font-extrabold mb-2 text-blue-900">{selectedAsset.name}</h2>
              <div className="mb-3 flex flex-wrap gap-4">
                <Badge className={getStatusBadge(selectedAsset.condition)}>{selectedAsset.condition}</Badge>
                <span className="text-gray-600">{selectedAsset.category} • {selectedAsset.modelSerial}</span>
                <span className="text-gray-600">{selectedAsset.manufacturer} ({selectedAsset.year})</span>
                {selectedAsset.assignedTo && (
                  <span className="text-blue-800 font-semibold">Assigned: {selectedAsset.assignedTo}</span>
                )}
              </div>
                  <div className="mb-3 text-sm text-gray-800 whitespace-pre-wrap">
                    <b>Specs:</b> {selectedAsset.specs || <span className="text-gray-400">None</span>}
                  </div>
                  <div className="mb-3 text-sm text-gray-700">
                    <b>Notes:</b> {selectedAsset.notes || <span className="text-gray-400">None</span>}
                  </div>

                  {/* --- MAINTENANCE HISTORY --- */}
                  <div className="mt-7">
                    <h3 className="font-bold text-blue-900 text-lg flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5" /> Maintenance History
                    </h3>
                    {maintenance.length === 0 ? (
                      <div className="text-gray-400 text-sm mt-1">No maintenance recorded yet.</div>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {maintenance.map((m) => (
                          <li key={m.id} className="bg-blue-50 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span>
                              <b>{m.type}</b> on {new Date(m.date).toLocaleDateString()} &mdash; {m.description}
                              {m.cost && <span className="ml-2 text-blue-900 font-bold">(${m.cost})</span>}
                            </span>
                            {m.addedBy && <span className="italic text-gray-400 ml-3">by {m.addedBy}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Add maintenance form */}
                    <div className="flex flex-wrap gap-2 items-end mt-4">
                      <select
                        value={newMaintenance.type}
                        onChange={e => setNewMaintenance(n => ({ ...n, type: e.target.value }))}
                        className="border rounded px-2 py-1"
                      >
                        <option>Inspection</option>
                        <option>Repair</option>
                        <option>Upgrade</option>
                        <option>Service</option>
                      </select>
                      <input
                        type="date"
                        value={newMaintenance.date}
                        onChange={e => setNewMaintenance(n => ({ ...n, date: e.target.value }))}
                        className="border rounded px-2 py-1"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Cost ($)"
                        value={newMaintenance.cost}
                        onChange={e => setNewMaintenance(n => ({ ...n, cost: e.target.value }))}
                        className="border rounded px-2 py-1 w-24"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={newMaintenance.description}
                        onChange={e => setNewMaintenance(n => ({ ...n, description: e.target.value }))}
                        className="border rounded px-2 py-1 flex-1"
                      />
                      <input
                        type="text"
                        placeholder="Your Name"
                        value={newMaintenance.addedBy}
                        onChange={e => setNewMaintenance(n => ({ ...n, addedBy: e.target.value }))}
                        className="border rounded px-2 py-1 w-36"
                      />
                      <Button size="sm" onClick={handleAddMaintenance}>Add</Button>
                    </div>
                  </div>

                  {/* --- OPEN ISSUES & REPORT FAULT --- */}
                  <div className="mt-8">
                    <h3 className="font-bold text-red-700 text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Open Issues / Report Fault
                    </h3>
                    {issues.length === 0 ? (
                      <div className="text-gray-400 text-sm mt-1">No issues reported yet.</div>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {issues.map((issue) => (
                          <li key={issue.id} className="bg-red-50 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span>
                              <span className={issue.status === "OPEN" ? "text-red-700 font-bold" : "text-green-700 font-semibold"}>
                                {issue.status === "OPEN" ? "OPEN" : "CLOSED"}
                              </span>
                              <span className="mx-2">{issue.description}</span>
                              {issue.createdAt && <span className="text-xs text-gray-400">({new Date(issue.createdAt).toLocaleDateString()})</span>}
                              {issue.status === "CLOSED" && issue.resolvedAt && (
                                <span className="text-xs text-green-800 ml-2">(Closed: {new Date(issue.resolvedAt).toLocaleDateString()})</span>
                              )}
                              {issue.reportedBy && (
                                <span className="text-xs text-gray-500 ml-2">(Reported by: {issue.reportedBy})</span>
                              )}
                              {issue.resolvedBy && issue.status === "CLOSED" && (
                                <span className="text-xs text-blue-700 ml-2">(Closed by: {issue.resolvedBy})</span>
                              )}
                            </span>
                            {issue.status === "OPEN" && (
                              <Button size="sm" variant="outline" onClick={() => handleCloseIssue(issue.id)}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Close
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2 items-end mt-4">
                      <Input
                        value={newIssue.description}
                        onChange={e => setNewIssue({ description: e.target.value })}
                        placeholder="Describe issue or fault..."
                        className="flex-1"
                      />
                      <Button size="sm" variant="destructive" onClick={handleAddIssue}>Report</Button>
                    </div>
                  </div>

                  {/* --- UPCOMING TASKS & REMINDERS --- */}
                  <div className="mt-8">
                    <h3 className="font-bold text-green-800 text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> Upcoming Tasks / Reminders
                    </h3>
                    {tasks.length === 0 ? (
                      <div className="text-gray-400 text-sm mt-1">No scheduled tasks or reminders yet.</div>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {tasks.map((t) => (
                          <li key={t.id} className="bg-green-50 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span>
                              {t.completed ? <span className="text-green-600 font-bold">Done</span> : <span className="text-yellow-800 font-bold">Open</span>}
                              <span className="mx-2">{t.description}</span>
                              <span className="text-xs text-gray-500">Due: {new Date(t.dueDate).toLocaleDateString()}</span>
                              <span className="ml-2 text-blue-800 font-semibold">{t.assignedTo && `Assigned: ${t.assignedTo}`}</span>
                            </span>
                            {!t.completed && (
                              <Button size="sm" onClick={() => handleCompleteTask(t.id)}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Mark Done
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-2 items-end mt-4">
                      <Input
                        value={newTask.description}
                        onChange={e => setNewTask(n => ({ ...n, description: e.target.value }))}
                        placeholder="Task / Reminder..."
                        className="flex-1"
                      />
                      <input
                        type="date"
                        value={newTask.dueDate}
                        onChange={e => setNewTask(n => ({ ...n, dueDate: e.target.value }))}
                        className="border rounded px-2 py-1"
                      />
                      <Input
                        value={newTask.assignedTo}
                        onChange={e => setNewTask(n => ({ ...n, assignedTo: e.target.value }))}
                        placeholder="Assignee"
                        className="w-36"
                      />
                      <Button size="sm" onClick={handleAddTask}>Add</Button>
                    </div>
                  </div>

                  {/* --- SMART ATTACHMENTS --- */}
                  <div className="mt-8">
                    <h3 className="font-bold text-indigo-700 text-lg flex items-center gap-2">
                      <Paperclip className="w-5 h-5" /> Attachments & Docs
                    </h3>
                    {attachments.length === 0 ? (
                      <div className="text-gray-400 text-sm mt-1">No files attached yet.</div>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {attachments.map((a) => (
                          <li key={a.id} className="bg-indigo-50 rounded-lg p-3 flex items-center gap-4">
                            <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline font-medium flex-1 truncate">
                              {a.name}
                            </a>
                            <span className="text-xs text-gray-600">{a.type}</span>
                            <span className="text-xs text-gray-500">{new Date(a.uploadedAt).toLocaleDateString()}</span>
                            {a.uploadedBy && <span className="text-xs text-gray-400">by {a.uploadedBy}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2 mt-4 items-center">
                      <input
                        type="file"
                        onChange={e => setUploadFile(e.target.files?.[0] || null)}
                        className="border rounded px-2 py-1"
                      />
                      <Button size="sm" onClick={handleUploadAttachment} disabled={!uploadFile}>
                        <Upload className="w-4 h-4 mr-1" /> Upload
                      </Button>
                      {uploadFile && (
                        <span className="ml-2 text-gray-700 text-xs">{uploadFile.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-8">
                    <Button variant="outline" onClick={() => setSelectedAsset(null)}>
                      Close
                    </Button>
                  </div>
                  </div>
                  </div>
                  )}
                  </div>
                  </main>
                  );
                  }