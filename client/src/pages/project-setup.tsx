import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { Header } from "@/components/header";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import {
  Phone,
  FileText,
  Edit,
  Plus,
  Trash2,
  CheckCircle,
  Lock,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

// --- Types ---
type EmergencyContact = {
  id?: string;
  contactType: string;
  name: string;
  phone: string;
  email?: string;
  responseTime?: string;
  lastVerified?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ERPProtocol = {
  id?: string;
  keywords: string;
  type: string;
  notify: string;
  protocol: string;
};

type ProjectInfo = {
  id: string;
  number: string;
  name: string;
  client: string;
  contractor: string;
  location: string;
  status: string;
  description: string;
};

// --- Form Validation Schema ---
const contactSchema = z.object({
  contactType: z.string().min(1, "Contact type is required"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  responseTime: z.string().optional(),
});

// --- Main Component ---
export default function ProjectSetup() {
  const PROJECT_ID = "1";
  const { toast } = useToast();

  // --- Project Info State ---
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [showGoldModal, setShowGoldModal] = useState(false);
  const [goldCodeInput, setGoldCodeInput] = useState("");
  const [goldError, setGoldError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<ProjectInfo | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  // --- Project Creation & Loading State ---
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [goldVerified, setGoldVerified] = useState(false); // for "Create" mode if project not found
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    number: "",
    name: "",
    client: "",
    contractor: "",
    location: "",
    status: "",
    description: "",
  });
  // --- Contacts State ---
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // --- ERP Protocols State ---
  const [erpProtocols, setErpProtocols] = useState<ERPProtocol[]>([]);
  const [isErpModalOpen, setIsErpModalOpen] = useState(false);
  const [editingErp, setEditingErp] = useState<ERPProtocol | null>(null);
  const [erpForm, setErpForm] = useState<ERPProtocol>({
    keywords: "",
    type: "",
    notify: "",
    protocol: "",
  });
  const [erpAdminUnlocked, setErpAdminUnlocked] = useState(false);
  const [unlockCode, setUnlockCode] = useState("");

  // --- Firestore Live Subscriptions ---
  // Project Info
  // --- Firestore Live Subscription for Project Info ---
  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    const ref = doc(db, "projects", PROJECT_ID);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProjectInfo({ ...(snap.data() as ProjectInfo), id: snap.id });
          setNotFound(false);
        } else {
          setProjectInfo(null);
          setNotFound(true);
        }
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setProjectInfo(null);
        setNotFound(true);
        toast({ title: "Error", description: "Failed to load project info: " + error.message, variant: "destructive" });
      }
    );
    return unsub;
  }, []);
  // Emergency Contacts
  useEffect(() => {
    const coll = collection(db, "projects", PROJECT_ID, "contacts");
    const unsub = onSnapshot(coll, (snap) => {
      setContacts(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as EmergencyContact));
    });
    return unsub;
  }, []);
  // ERP Protocols
  useEffect(() => {
    const coll = collection(db, "projects", PROJECT_ID, "erpProtocols");
    const unsub = onSnapshot(coll, (snap) => {
      setErpProtocols(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as ERPProtocol));
    });
    return unsub;
  }, []);

  // --- Project Info: Gold Unlock Flow ---
  const handleGoldUnlock = () => {
    if (goldCodeInput === "000" && projectInfo) {
      setEditForm({ ...projectInfo });
      setShowGoldModal(false);
      setEditModalOpen(true);
      setGoldCodeInput("");
      setGoldError("");
    } else {
      setGoldError("Incorrect code. Access denied.");
    }
  };

  function handleFieldChange(field: keyof ProjectInfo, value: string) {
    setEditForm(f => f ? { ...f, [field]: value } : f);
    setFormErrors(prev => ({ ...prev, [field]: "" }));
  }

  async function handleProjectSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    let errors: { [key: string]: string } = {};
    if (!editForm.number) errors.number = "Project number is required.";
    if (!editForm.name) errors.name = "Project name is required.";
    if (!editForm.client) errors.client = "Client is required.";
    if (!editForm.status) errors.status = "Status is required.";
    if (!editForm.location) errors.location = "Location is required.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      await setDoc(doc(db, "projects", PROJECT_ID), { ...editForm }, { merge: true });
      setProjectInfo({ ...editForm, id: PROJECT_ID }); //  this line is for instant UI update
      setEditModalOpen(false);
      setFormErrors({});
      toast({ title: "Project info updated!", description: "Changes have been saved." });
    } catch {
      toast({ title: "Error", description: "Failed to update project info.", variant: "destructive" });
    }
  }

  // --- Contacts CRUD ---
  const contactForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      contactType: "",
      name: "",
      phone: "",
      email: "",
      responseTime: "",
    },
  });

  const saveContact = async (data: z.infer<typeof contactSchema>) => {
    try {
      if (editingContact?.id) {
        await updateDoc(doc(db, "projects", PROJECT_ID, "contacts", editingContact.id), {
          ...editingContact, ...data, updatedAt: new Date().toISOString(),
        });
        toast({ title: "Contact updated!" });
      } else {
        const newRef = doc(collection(db, "projects", PROJECT_ID, "contacts"));
        await setDoc(newRef, {
          ...data,
          id: newRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast({ title: "Contact added!" });
      }
      setIsContactModalOpen(false);
      setEditingContact(null);
      contactForm.reset();
    } catch {
      toast({ title: "Error", description: "Could not save contact", variant: "destructive" });
    }
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    contactForm.reset({
      contactType: contact.contactType,
      name: contact.name,
      phone: contact.phone,
      email: contact.email || "",
      responseTime: contact.responseTime || "",
    });
    setIsContactModalOpen(true);
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await deleteDoc(doc(db, "projects", PROJECT_ID, "contacts", id));
      toast({ title: "Contact removed" });
    } catch {
      toast({ title: "Error", description: "Could not delete contact", variant: "destructive" });
    }
  };

  // --- ERP CRUD ---
  const handleEditErp = (protocol: ERPProtocol) => {
    setEditingErp(protocol);
    setErpForm(protocol);
    setIsErpModalOpen(true);
  };
  const handleNewErp = () => {
    setEditingErp(null);
    setErpForm({ keywords: "", type: "", notify: "", protocol: "" });
    setIsErpModalOpen(true);
  };
  const handleSaveErp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingErp?.id) {
        await updateDoc(doc(db, "projects", PROJECT_ID, "erpProtocols", editingErp.id), {
          ...erpForm, id: editingErp.id,
        });
        toast({ title: "ERP Protocol updated" });
      } else {
        const newRef = doc(collection(db, "projects", PROJECT_ID, "erpProtocols"));
        await setDoc(newRef, { ...erpForm, id: newRef.id });
        toast({ title: "ERP Protocol added" });
      }
      setIsErpModalOpen(false);
      setEditingErp(null);
      setErpForm({ keywords: "", type: "", notify: "", protocol: "" });
    } catch (err) {
      toast({ title: "Error", description: "Could not save ERP Protocol", variant: "destructive" });
    }
  };
  const handleDeleteErp = async (id: string) => {
    try {
      await deleteDoc(doc(db, "projects", PROJECT_ID, "erpProtocols", id));
      toast({ title: "ERP Protocol deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete ERP Protocol", variant: "destructive" });
    }
  };

  // --- UI helpers
  const getContactTypeLabel = (type: string) => {
    switch (type) {
      case "HOSPITAL": return "Primary Hospital";
      case "MEDEVAC": return "MEDEVAC Service";
      case "MARINE_RESCUE": return "Marine Rescue";
      case "POLICE": return "Police";
      case "COAST_GUARD": return "Coast Guard";
      default: return type;
    }
  };
  const getContactIcon = (type: string) => {
    switch (type) {
      case "HOSPITAL": return "🏥";
      case "MEDEVAC": return "🚁";
      case "MARINE_RESCUE": return "⚓";
      case "POLICE": return "🚔";
      case "COAST_GUARD": return "🚢";
      default: return "📞";
    }
  };

  // --- Main Render ---
      if (loading) {
        return (
          <div className="flex flex-col items-center justify-center h-72">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-hydro-dark mb-3"></div>
            <div className="font-medium text-hydro-dark">Loading project info...</div>
          </div>
        );
      }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center h-72">
        <div className="text-2xl text-hydro-dark font-bold mb-2">No Project Found</div>
        <div className="text-gray-600 mb-4">
          This project does not exist in the database.<br />
          Only Gold Command can create it.
        </div>
        {!goldVerified && (
          <button
            className="bg-yellow-600 text-white px-4 py-2 rounded font-bold"
            onClick={() => setShowGoldModal(true)}
          >
            Gold Command: Create Project
          </button>
        )}
        {/* --- Gold Code Modal --- */}
        {showGoldModal && !goldVerified && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center">
              <h3 className="font-bold text-xl mb-4 text-hydro-dark text-center">Gold Command Only</h3>
              <input
                type="password"
                placeholder="Gold Code"
                value={goldCodeInput}
                onChange={e => setGoldCodeInput(e.target.value)}
                className="mb-2 px-3 py-2 border rounded"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter" && goldCodeInput === "000") {
                    setGoldVerified(true);
                    setShowGoldModal(false);
                    setGoldCodeInput("");
                  }
                }}
              />
              <button
                className="w-32 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded mt-2"
                onClick={() => {
                  if (goldCodeInput === "000") {
                    setGoldVerified(true);
                    setShowGoldModal(false);
                    setGoldCodeInput("");
                  }
                }}
              >
                Confirm
              </button>
              <button
                className="w-32 mt-2"
                onClick={() => {
                  setShowGoldModal(false);
                  setGoldCodeInput("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {/* --- Create Project Form (Only after Gold Code) --- */}
        {goldVerified && (
          <div className="mt-8 w-full max-w-lg bg-white p-8 rounded shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-hydro-dark">Create New Project</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setCreatingProject(true);
                try {
                  await setDoc(doc(db, "projects", PROJECT_ID), {
                    ...newProjectForm,
                    createdAt: new Date().toISOString(),
                  });
                  setGoldVerified(false);
                  setShowGoldModal(false);
                  setGoldCodeInput("");
                  setNotFound(false);
                  setNewProjectForm({
                    number: "",
                    name: "",
                    client: "",
                    contractor: "",
                    location: "",
                    status: "",
                    description: "",
                  });
                  toast({ title: "Project created!", description: "Project info added." });
                } catch (err: any) {
                  toast({ title: "Error", description: err.message, variant: "destructive" });
                }
                setCreatingProject(false);
              }}
            >
              <input
                type="text"
                placeholder="Project Number"
                className="block mb-2 border rounded px-2 py-1 w-full"
                value={newProjectForm.number}
                onChange={e => setNewProjectForm(f => ({ ...f, number: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Project Name"
                className="block mb-2 border rounded px-2 py-1 w-full"
                value={newProjectForm.name}
                onChange={e => setNewProjectForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Client"
                className="block mb-2 border rounded px-2 py-1 w-full"
                value={newProjectForm.client}
                onChange={e => setNewProjectForm(f => ({ ...f, client: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Contractor"
                className="block mb-2 border rounded px-2 py-1 w-full"
                value={newProjectForm.contractor}
                onChange={e => setNewProjectForm(f => ({ ...f, contractor: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Location"
                className="block mb-2 border rounded px-2 py-1 w-full"
                value={newProjectForm.location}
                onChange={e => setNewProjectForm(f => ({ ...f, location: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Status"
                className="block mb-2 border rounded px-2 py-1 w-full"
                value={newProjectForm.status}
                onChange={e => setNewProjectForm(f => ({ ...f, status: e.target.value }))}
                required
              />
              <textarea
                placeholder="Description"
                className="block mb-4 border rounded px-2 py-1 w-full"
                value={newProjectForm.description}
                onChange={e => setNewProjectForm(f => ({ ...f, description: e.target.value }))}
              />
              <button
                type="submit"
                disabled={creatingProject}
                className="bg-hydro-dark hover:bg-hydro-dark/80 text-white px-6 py-2 rounded font-bold mt-4 w-full"
              >
                {creatingProject ? "Creating..." : "Create Project"}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }
      return (
        <div className="min-h-screen bg-hydro-light">
          <Header user={{ role: "GOLD", name: "David Mooney", title: "General Manager", initials: "DM" }} project={projectInfo || undefined} />
          <Navigation />
          <main className="container mx-auto px-4 py-6">
              <Tabs defaultValue="project" className="space-y-6">
                <TabsList
                  className="flex overflow-x-auto whitespace-nowrap no-scrollbar rounded-xl border border-gray-200 bg-gray-50 p-1 gap-2 max-w-full"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <TabsTrigger className="px-4 py-2 rounded-xl font-medium truncate" value="project">
                    Project Details
                  </TabsTrigger>
                  <TabsTrigger className="px-4 py-2 rounded-xl font-medium truncate" value="contacts">
                    Emergency Contacts
                  </TabsTrigger>
                  <TabsTrigger className="px-4 py-2 rounded-xl font-medium truncate" value="erp">
                    ERP Protocols
                  </TabsTrigger>
                  <TabsTrigger className="px-4 py-2 rounded-xl font-medium truncate" value="assets">
                    Assets & Equipment
                  </TabsTrigger>
                  <TabsTrigger className="px-4 py-2 rounded-xl font-medium truncate" value="team">
                    Team Assignments
                  </TabsTrigger>
                  {/* --- Add your other tabs here ... --- */}
                </TabsList>
                {/* ...Tab content below... */}
              </Tabs>

          {/* --- PROJECT DETAILS --- */}
          <TabsContent value="project">
            <Card className="hydro-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-primary" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                  <div>
                    <Label className="font-bold">Project Number</Label>
                    <Input value={projectInfo?.number || ""} readOnly className="bg-gray-100 cursor-not-allowed" />
                  </div>
                  <div>
                    <Label className="font-bold">Status</Label>
                    <Input value={projectInfo?.status || ""} readOnly className="bg-gray-100 cursor-not-allowed" />
                  </div>
                </div>
                <div>
                  <Label className="font-bold">Project Name</Label>
                  <Input value={projectInfo?.name || ""} readOnly className="bg-gray-100 cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="font-bold">Client</Label>
                    <Input value={projectInfo?.client || ""} readOnly className="bg-gray-100 cursor-not-allowed" />
                  </div>
                  <div>
                    <Label className="font-bold">Contractor</Label>
                    <Input value={projectInfo?.contractor || ""} readOnly className="bg-gray-100 cursor-not-allowed" />
                  </div>
                </div>
                <div>
                  <Label className="font-bold">Location</Label>
                  <Input value={projectInfo?.location || ""} readOnly className="bg-gray-100 cursor-not-allowed" />
                </div>
                <div>
                  <Label className="font-bold">Description</Label>
                  <Textarea value={projectInfo?.description || ""} readOnly rows={3} className="bg-gray-100 cursor-not-allowed" />
                </div>
                <Button
                  variant="outline"
                  className="mt-4 font-bold"
                  disabled={!projectInfo}
                  onClick={() => setShowGoldModal(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Project Info (Gold Code)
                </Button>
                {/* Gold Code Modal */}
                {showGoldModal && (
                  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center">
                      <Lock className="w-9 h-9 text-yellow-600 mb-4" />
                      <h3 className="font-bold text-xl mb-4 text-hydro-dark text-center">Gold Command Only</h3>
                      <p className="text-center text-gray-700 mb-2 font-medium">
                        Enter Gold Command Code to edit Project Info
                      </p>
                      <Input
                        type="password"
                        placeholder="Gold Code"
                        value={goldCodeInput}
                        onChange={e => setGoldCodeInput(e.target.value)}
                        className="mb-2"
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") handleGoldUnlock(); }}
                      />
                      {goldError && <div className="text-red-600 mt-1">{goldError}</div>}
                      <div className="flex gap-2 mt-3">
                        <Button className="w-32 bg-yellow-600 hover:bg-yellow-700 text-white" onClick={handleGoldUnlock}>
                          Confirm
                        </Button>
                        <Button variant="outline" onClick={() => { setShowGoldModal(false); setGoldCodeInput(""); setGoldError(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Edit Project Modal */}
                {editModalOpen && editForm && (
                  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8">
                      <h3 className="text-2xl font-bold text-hydro-dark mb-6 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-primary" /> Edit Project Info
                      </h3>
                      <form
                        onSubmit={handleProjectSave}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Project Number</Label>
                            <Input
                              value={editForm.number || ""}
                              onChange={e =>
                                handleFieldChange("number", e.target.value)
                              }
                              required
                            />
                            {formErrors.number && (
                              <div className="text-red-600 text-xs">{formErrors.number}</div>
                            )}
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Input
                              value={editForm.status || ""}
                              onChange={e =>
                                handleFieldChange("status", e.target.value)
                              }
                              required
                            />
                            {formErrors.status && (
                              <div className="text-red-600 text-xs">{formErrors.status}</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label>Project Name</Label>
                          <Input
                            value={editForm.name || ""}
                            onChange={e =>
                              handleFieldChange("name", e.target.value)
                            }
                            required
                          />
                          {formErrors.name && (
                            <div className="text-red-600 text-xs">{formErrors.name}</div>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                                <Label>Client</Label>
                                <Input
                                  value={editForm.client || ""}
                                  onChange={e =>
                                    handleFieldChange("client", e.target.value)
                                  }
                                  required
                                />
                                {formErrors.client && (
                                  <div className="text-red-600 text-xs">{formErrors.client}</div>
                                )}
                                </div>
                                <div>
                                  <Label>Contractor</Label>
                                  <Input
                                    value={editForm.contractor || ""}
                                    onChange={e =>
                                      handleFieldChange("contractor", e.target.value)
                                    }
                                  />
                                </div>
                                </div>
                                <div>
                                  <Label>Location</Label>
                                  <Input
                                    value={editForm.location || ""}
                                    onChange={e =>
                                      handleFieldChange("location", e.target.value)
                                    }
                                    required
                                  />
                                  {formErrors.location && (
                                    <div className="text-red-600 text-xs">{formErrors.location}</div>
                                  )}
                                </div>
                                <div>
                                  <Label>Description</Label>
                                  <Textarea
                                    value={editForm.description || ""}
                                    onChange={e =>
                                      handleFieldChange("description", e.target.value)
                                    }
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-3 mt-6 justify-end">
                                  <Button
                                    type="submit"
                                    className="hydro-button-primary font-bold px-7"
                                    disabled={
                                      !editForm?.number ||
                                      !editForm?.name ||
                                      !editForm?.client ||
                                      !editForm?.status ||
                                      !editForm?.location
                                    }
                                  >
                                    Save Changes
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="px-7"
                                    onClick={() => {
                                      setEditModalOpen(false);
                                      setEditForm(null); // Add this to clean up form state
                                      setFormErrors({});
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                                </form>
                                </div>
                                </div>
                                )}
                                </CardContent>
                                </Card>
                                </TabsContent>

                                {/* --- EMERGENCY CONTACTS TAB --- */}
                                <TabsContent value="contacts">
                                  <Card className="hydro-card">
                                    <CardHeader>
                                      <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          <Phone className="w-5 h-5 mr-2 text-primary" />
                                          Emergency Contacts
                                        </div>
                                        <Button
                                          onClick={() => {
                                            setEditingContact(null);
                                            contactForm.reset({
                                              contactType: "",
                                              name: "",
                                              phone: "",
                                              email: "",
                                              responseTime: "",
                                            });
                                            setIsContactModalOpen(true);
                                          }}
                                          className="hydro-button-primary"
                                        >
                                          <Plus className="w-4 h-4 mr-2" />
                                          Add/Update Contact
                                        </Button>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-4">
                                        {contacts.map((contact) => (
                                          <div key={contact.id} className="p-4 border rounded-lg bg-white shadow-sm">
                                            <div className="flex items-start justify-between">
                                              <div className="flex items-start space-x-3">
                                                <div className="text-2xl">{getContactIcon(contact.contactType)}</div>
                                                <div>
                                                  <h4 className="font-medium text-hydro-dark">
                                                    {getContactTypeLabel(contact.contactType)}
                                                  </h4>
                                                  <p className="text-sm text-gray-600">{contact.name}</p>
                                                  <div className="mt-2 space-y-1">
                                                    <div
                                                      className="flex items-center text-sm text-gray-600 cursor-pointer hover:text-green-600 transition-colors"
                                                      onClick={() => window.open(`tel:${contact.phone}`, "_self")}
                                                    >
                                                      <Phone className="w-3 h-3 mr-2" />
                                                      <span className="hover:underline font-mono">{contact.phone}</span>
                                                    </div>
                                                    {contact.email && (
                                                      <div className="flex items-center text-sm text-gray-600">
                                                        📧 {contact.email}
                                                      </div>
                                                    )}
                                                    {contact.responseTime && (
                                                      <div className="flex items-center text-sm text-green-600">
                                                        ⏱️ Response time: {contact.responseTime}
                                                      </div>
                                                    )}
                                                    {contact.lastVerified && (
                                                      <div className="flex items-center text-sm text-gray-500">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Last verified: {contact.lastVerified}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex space-x-2">
                                                <Button
                                                  size="sm"
                                                  className="bg-green-600 hover:bg-green-700 text-white"
                                                  onClick={() => window.open(`tel:${contact.phone}`, "_self")}
                                                >
                                                  <Phone className="w-3 h-3 mr-1" />
                                                  Call
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => handleEditContact(contact)}
                                                >
                                                  <Edit className="w-3 h-3 mr-1" />
                                                  Edit
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="text-red-600 hover:text-red-700"
                                                  onClick={() => handleDeleteContact(contact.id!)}
                                                >
                                                  <Trash2 className="w-3 h-3 mr-1" />
                                                  Remove
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      {/* Contact Modal */}
                                      {isContactModalOpen && (
                                        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                                          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                                            <h3 className="text-xl font-bold text-hydro-dark mb-4">
                                              {editingContact ? "Update Contact" : "Add Contact"}
                                            </h3>
                                            <Form {...contactForm}>
                                              <form onSubmit={contactForm.handleSubmit(saveContact)} className="space-y-4">
                                                <FormField
                                                  control={contactForm.control}
                                                  name="contactType"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Contact Type</FormLabel>
                                                      <FormControl>
                                                        <select {...field} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                                          <option value="">Select type...</option>
                                                          <option value="HOSPITAL">Hospital</option>
                                                          <option value="MEDEVAC">MEDEVAC Service</option>
                                                          <option value="MARINE_RESCUE">Marine Rescue</option>
                                                          <option value="POLICE">Police</option>
                                                          <option value="COAST_GUARD">Coast Guard</option>
                                                        </select>
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={contactForm.control}
                                                  name="name"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Organization Name</FormLabel>
                                                      <FormControl>
                                                        <Input placeholder="e.g., Warri Central Hospital" {...field} />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={contactForm.control}
                                                  name="phone"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Phone Number</FormLabel>
                                                      <FormControl>
                                                        <Input placeholder="+234-XXX-XXX-XXXX" {...field} />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={contactForm.control}
                                                  name="email"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Email (Optional)</FormLabel>
                                                      <FormControl>
                                                        <Input placeholder="contact@organization.com" {...field} />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={contactForm.control}
                                                  name="responseTime"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Response Time (Optional)</FormLabel>
                                                      <FormControl>
                                                        <Input placeholder="e.g., 25 minutes" {...field} />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <div className="flex space-x-3">
                                                  <Button type="submit" className="flex-1 hydro-button-primary">
                                                    {editingContact ? "Update Contact" : "Add Contact"}
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => setIsContactModalOpen(false)}
                                                  >
                                                    Cancel
                                                  </Button>
                                                </div>
                                              </form>
                                            </Form>
                                          </div>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                </TabsContent>

                                {/* --- ERP PROTOCOLS TAB --- */}
                                <TabsContent value="erp">
                                  <Card className="hydro-card">
                                    <CardHeader>
                                      <CardTitle className="flex items-center">
                                        <Lock className="w-5 h-5 mr-2 text-yellow-600" />
                                        Emergency Response Protocols (ERP)
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      {!erpAdminUnlocked ? (
                                        <div className="flex flex-col items-center my-8">
                                          <p className="mb-4 font-semibold text-hydro-dark text-center">
                                            Enter ERP Admin Code to Edit Project Emergency Protocols
                                          </p>
                                          <input
                                            type="password"
                                            value={unlockCode}
                                            onChange={(e) => setUnlockCode(e.target.value)}
                                            className="w-56 border border-gray-300 rounded px-3 py-2 text-lg mb-2"
                                            placeholder="ERP Admin Code"
                                          />
                                          <Button
                                            onClick={() => {
                                              if (unlockCode === "000") {
                                                setErpAdminUnlocked(true);
                                                setUnlockCode("");
                                              } else {
                                                toast({ title: "Access Denied", description: "Incorrect code", variant: "destructive" });
                                              }
                                            }}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                          >
                                            Unlock
                                          </Button>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-xl font-bold text-hydro-dark">Protocols for this Project</h2>
                                            <Button className="hydro-button-primary" onClick={handleNewErp}>
                                              <Plus className="w-4 h-4 mr-2" />
                                              Add Protocol
                                            </Button>
                                          </div>
                                          <div className="space-y-4">
                                            {erpProtocols.map((proto) => (
                                              <div key={proto.id} className="p-4 border rounded-lg bg-white shadow-sm flex flex-col gap-2">
                                                <div className="flex flex-row justify-between items-center">
                                                  <div>
                                                    <div className="font-bold text-lg text-primary mb-1">{proto.type}</div>
                                                    <div className="text-sm text-gray-600 mb-1">
                                                      <b>Keywords:</b> <span className="font-mono">{proto.keywords}</span>
                                                    </div>
                                                    <div className="text-xs text-hydro-dark mb-1">
                                                      <b>Notify Roles:</b> {proto.notify}
                                                    </div>
                                                    <div className="text-xs text-hydro-dark mb-2">
                                                      <b>Protocol:</b>
                                                      <div className="text-gray-700 whitespace-pre-line">{proto.protocol}</div>
                                                    </div>
                                                  </div>
                                                  <div className="flex flex-col gap-2 items-end ml-4">
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="text-blue-700 hover:text-blue-900"
                                                      onClick={() => handleEditErp(proto)}
                                                    >
                                                      <Edit className="w-3 h-3 mr-1" />
                                                      Edit
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="text-red-700 hover:text-red-900"
                                                      onClick={() => proto.id && handleDeleteErp(proto.id)}
                                                    >
                                                      <Trash2 className="w-3 h-3 mr-1" />
                                                      Delete
                                                    </Button>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                            {erpProtocols.length === 0 && (
                                              <div className="p-4 text-center text-gray-400 italic">
                                                No protocols have been added for this project yet.
                                              </div>
                                            )}
                                          </div>
                                          {/* ERP Protocol Modal */}
                                          {isErpModalOpen && (
                                            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                                              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                                                <h3 className="text-xl font-bold text-hydro-dark mb-4">
                                                  {editingErp ? "Edit ERP Protocol" : "Add ERP Protocol"}
                                                </h3>
                                                <form onSubmit={handleSaveErp} className="space-y-4">
                                                  <div>
                                                    <Label>Scenario/Type (e.g. Fire, Loss of Comms)</Label>
                                                    <Input
                                                      value={erpForm.type}
                                                      onChange={e => setErpForm(f => ({ ...f, type: e.target.value }))}
                                                      placeholder="e.g. Fire/Evacuation"
                                                      required
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label>Keywords (comma-separated, incl. misspellings)</Label>
                                                    <Textarea
                                                      value={erpForm.keywords}
                                                      onChange={e => setErpForm(f => ({ ...f, keywords: e.target.value }))}
                                                      placeholder="fire, firee, explosion, smoke, etc."
                                                      rows={2}
                                                      required
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label>Roles to Notify (comma-separated)</Label>
                                                    <Input
                                                      value={erpForm.notify}
                                                      onChange={e => setErpForm(f => ({ ...f, notify: e.target.value }))}
                                                      placeholder="GOLD, SILVER, BRONZE"
                                                      required
                                                    />
                                                  </div>
                                                  <div>
                                                    <Label>Response Protocol (step by step, can be multi-line)</Label>
                                                    <Textarea
                                                      value={erpForm.protocol}
                                                      onChange={e => setErpForm(f => ({ ...f, protocol: e.target.value }))}
                                                      rows={4}
                                                      required
                                                    />
                                                  </div>
                                                  <div className="flex space-x-3 mt-3">
                                                    <Button type="submit" className="flex-1 hydro-button-primary">
                                                      {editingErp ? "Save Changes" : "Add Protocol"}
                                                    </Button>
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      className="flex-1"
                                                      onClick={() => {
                                                        setIsErpModalOpen(false);
                                                        setEditingErp(null);
                                                        setErpForm({ keywords: "", type: "", notify: "", protocol: "" });
                                                      }}
                                                    >
                                                      Cancel
                                                    </Button>
                                                  </div>
                                                </form>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                </TabsContent>

                                {/* --- ASSETS & EQUIPMENT TAB --- */}
                                <TabsContent value="assets">
                                  <Card className="hydro-card">
                                    <CardHeader>
                                      <CardTitle className="flex items-center">
                                        <FileText className="w-5 h-5 mr-2 text-primary" />
                                        Assets & Equipment
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="p-6 text-gray-500 italic text-center">
                                        {/* --- Plug in your assets logic here, or extend from previous file! --- */}
                                        (Assets management coming soon...)
                                      </div>
                                    </CardContent>
                                  </Card>
                                </TabsContent>

{/* --- TEAM ASSIGNMENTS TAB --- */}
<TabsContent value="team">
  <Card className="hydro-card">
    <CardHeader>
      <CardTitle className="flex items-center">
        <FileText className="w-5 h-5 mr-2 text-primary" />
        Team Assignments
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="p-6 text-gray-500 italic text-center">
        {/* --- Plug in your team logic here, or extend from previous file! --- */}
        (Team assignments management coming soon...)
      </div>
    </CardContent>
  </Card>
</TabsContent>

{/* --- Add your other tabs here ... --- */}
</Tabs>
</main>
</div>
);
}