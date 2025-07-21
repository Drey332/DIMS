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
import { AIERPAdvisorModal } from "../components/AIERPAdvisorModal";

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
  notify: string[];
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

type AIAdvisorResponse = {
  corrections?: Record<string, any>;
  improvedKeywords?: string;
  improvedProtocol?: string;
  modelReference?: string;
  missingSteps?: string;
  industryNotes?: string;
  fmecaTable?: {
    mode: string;
    effect: string;
    control: string;
    criticality: string;
  }[];
  error?: string;
};

// --- Form Validation Schema ---
const contactSchema = z.object({
  contactType: z.string().min(1, "Contact type is required"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  responseTime: z.string().optional(),
});
// --- Asset & Equipment Types and Schema ---
type AssetEquipment = {
  id?: string;
  name: string;
  category: string;
  modelSerial: string;
  manufacturer: string;
  year: string;
  condition: "New" | "Good" | "Fair" | "Needs Repair";
  assignedTo?: string;
  specs?: string;
  notes?: string;
  attachments?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  versions?: any[]; // For audit/versioning (optional)
};

const assetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  category: z.string().min(1, "Category is required"),
  modelSerial: z.string().min(1, "Model/Serial # required"),
  manufacturer: z.string().min(1, "Manufacturer required"),
  year: z.string().min(4, "Year required"),
  condition: z.enum(["New", "Good", "Fair", "Needs Repair"]),
  assignedTo: z.string().optional(),
  specs: z.string().optional(),
  notes: z.string().optional(),
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
    notify: [],
    protocol: "",
  });
  const [notifyRaw, setNotifyRaw] = useState("");
  const [erpAdminUnlocked, setErpAdminUnlocked] = useState(false);
  const [unlockCode, setUnlockCode] = useState("");
  const [tabValue, setTabValue] = useState("project");
  const [aiAdvisorOpen, setAiAdvisorOpen] = useState(false); // Controls the AI modal
  const [aiAdvisorData, setAiAdvisorData] = useState<AIAdvisorResponse | null>(null); // Stores AI suggestions
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiOverrides, setAiOverrides] = useState<Record<string, string>>({});

  const [showReviewChoice, setShowReviewChoice] = useState(false);
  const [erpSaveMode, setErpSaveMode] = useState<"create" | "edit" | null>(null);
  // --- ASSETS STATE & HOOKS ---
  const [assets, setAssets] = useState<AssetEquipment[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetEquipment | null>(null);


  const [showGoldAssetModal, setShowGoldAssetModal] = useState(false);
  const [goldAssetCodeInput, setGoldAssetCodeInput] = useState("");
  const [goldAssetError, setGoldAssetError] = useState("");
  const [assetModalUnlocked, setAssetModalUnlocked] = useState(false);
  // Permission: Only allow editing if Gold code verified (or projectInfo exists, whatever you use)
    // adjust if needed
  const userCanEditAssets = assetModalUnlocked;
  // Firestore: Real-time sync for assets
  useEffect(() => {
    const coll = collection(db, "projects", PROJECT_ID, "assets");
    const unsub = onSnapshot(coll, (snap) => {
      setAssets(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as AssetEquipment));
    });
    return unsub;
  }, []);

  // Asset form hook
  const assetForm = useForm<z.infer<typeof assetSchema>>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: "",
      category: "",
      modelSerial: "",
      manufacturer: "",
      year: "",
      condition: "New",
      assignedTo: "",
      specs: "",
      notes: "",
    },
  });

  const saveAsset = async (data: z.infer<typeof assetSchema>) => {
    try {
      if (editingAsset?.id) {
        // Versioning logic optional for v1
        const assetRef = doc(db, "projects", PROJECT_ID, "assets", editingAsset.id);
        await updateDoc(assetRef, {
          ...editingAsset,
          ...data,
          updatedAt: new Date().toISOString(),
        });
        toast({ title: "Asset updated!" });
      } else {
        const newRef = doc(collection(db, "projects", PROJECT_ID, "assets"));
        await setDoc(newRef, {
          ...data,
          id: newRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "GOLD", // or whatever ID/name you want
        });
        toast({ title: "Asset added!" });
      }
      setIsAssetModalOpen(false);
      setEditingAsset(null);
      assetForm.reset();
    } catch {
      toast({ title: "Error", description: "Could not save asset", variant: "destructive" });
    }
  };
  const handleGoldAssetUnlock = () => {
    if (goldAssetCodeInput === "000") {
      setAssetModalUnlocked(true);
      setShowGoldAssetModal(false);
      setGoldAssetCodeInput("");
      setGoldAssetError("");
      setTimeout(() => setIsAssetModalOpen(true), 250);
    } else {
      setGoldAssetError("Incorrect code. Access denied.");
    }
  };

  const handleEditAsset = (asset: AssetEquipment) => {
    setEditingAsset(asset);
    assetForm.reset({
      name: asset.name,
      category: asset.category,
      modelSerial: asset.modelSerial,
      manufacturer: asset.manufacturer,
      year: asset.year,
      condition: asset.condition,
      assignedTo: asset.assignedTo || "",
      specs: asset.specs || "",
      notes: asset.notes || "",
    });
    setIsAssetModalOpen(true);
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await deleteDoc(doc(db, "projects", PROJECT_ID, "assets", id));
      toast({ title: "Asset removed" });
    } catch {
      toast({ title: "Error", description: "Could not delete asset", variant: "destructive" });
    }
  };
// --- Reset ERP Modals ---
  function resetErpModals() {
    setIsErpModalOpen(false);
    setEditingErp(null);
    setErpForm({ keywords: "", type: "", notify: [], protocol: "" });
    setShowReviewChoice(false);
    setAiAdvisorOpen(false);
    setAiAdvisorData(null);
    setAiOverrides({});
  }
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
  // --- ERP SAVE DIRECTLY ---
  const saveERPDirectly = async () => {
    setAiSaving(true);
    try {
      const parseNotify = (value: any): string[] => {
        if (Array.isArray(value)) return value.map(x => x.trim().toUpperCase());
        if (typeof value === "string") return value.split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
        return [];
      };
      const finalNotify = parseNotify(notifyRaw);
      const saveObj: ERPProtocol = {
        ...erpForm,
        notify: finalNotify,
      };

      if (editingErp) {
        if (editingErp.id) {
          await updateDoc(doc(db, "projects", PROJECT_ID, "erpProtocols", editingErp.id), {
            ...saveObj, id: editingErp.id
          });
        } else {
          toast({ title: "Error", description: "Editing ERP is missing ID.", variant: "destructive" });
          setAiSaving(false);
          return;
        }
      } else {
        const newRef = doc(collection(db, "projects", PROJECT_ID, "erpProtocols"));
        await setDoc(newRef, { ...saveObj, id: newRef.id });
      }

      toast({ title: "ERP Protocol saved" });
      setIsErpModalOpen(false);
      setEditingErp(null);
      setErpForm({ keywords: "", type: "", notify: [], protocol: "" });
      setShowReviewChoice(false);
    } catch (err) {
      toast({ title: "Error", description: "Could not save ERP Protocol", variant: "destructive" });
    } finally {
      setAiSaving(false);
    }
  };

  // --- ERP OVERRIDE SAVE (ADD HERE) ---
  const handleOverride = async () => {
    setAiSaving(true);
    try {
      const parseNotify = (value: any): string[] => {
        if (Array.isArray(value)) return value.map(x => x.trim().toUpperCase());
        if (typeof value === "string") return value.split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
        return [];
      };
      const finalNotify = parseNotify(notifyRaw);
      const saveObj: ERPProtocol = {
        ...erpForm,
        notify: finalNotify,
      };
      if (editingErp?.id) {
        await updateDoc(doc(db, "projects", PROJECT_ID, "erpProtocols", editingErp.id), {
          ...saveObj, id: editingErp.id
        });
      } else {
        const newRef = doc(collection(db, "projects", PROJECT_ID, "erpProtocols"));
        await setDoc(newRef, { ...saveObj, id: newRef.id });
      }
      toast({ title: "ERP Protocol saved (Override/no AI applied)" });
      setErpForm({ keywords: "", type: "", notify: [], protocol: "" });
      setAiAdvisorOpen(false);
      setIsErpModalOpen(false);
      setAiAdvisorData(null);
      setAiOverrides({});
      setEditingErp(null);
    } catch (err) {
      toast({ title: "Error", description: "Could not save ERP Protocol", variant: "destructive" });
    } finally {
      setAiSaving(false);
    }
  };


  // --- ERP CRUD ---
  const handleEditErp = (protocol: ERPProtocol) => {
    setEditingErp(protocol);
    setErpForm(protocol);
    setIsErpModalOpen(true);
    setNotifyRaw(Array.isArray(protocol.notify) ? protocol.notify.join(", ") : "");
    setAiAdvisorData(null); // <-- make sure this is always reset!
  };
  const handleNewErp = () => {
    setEditingErp(null);
    setErpForm({ keywords: "", type: "", notify: [], protocol: "" });
    setIsErpModalOpen(true);
    setNotifyRaw("");
  };
// AI review of the ERP
  const handleAiReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiReviewLoading(true);
    setAiAdvisorOpen(true);
    setAiAdvisorData(null);

    const erpDraft = { ...erpForm };
    try {
      const resp = await fetch("/api/ai-erp-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ erpDraft }),
      });
      const aiData = await resp.json();
      setAiAdvisorData(aiData);
    } catch (err) {
      setAiAdvisorData({ error: "AI review failed. Please try again." });
    }
    setAiReviewLoading(false);
  };
  const saveErpWithAi = async (aiData: any) => {
    setAiSaving(true);
    try {
      if (editingErp) {
        if (editingErp.id) {
          // Update existing ERP by id with AI-reviewed data
          await updateDoc(
            doc(db, "projects", PROJECT_ID, "erpProtocols", editingErp.id),
            {
              ...erpForm,      // PM's form data (can be replaced by aiData fields if you prefer)
              ...aiData,       // AI reviewed/enhanced fields
              id: editingErp.id,
            }
          );
          toast({ title: "ERP Protocol updated (AI reviewed)" });
        } else {
          // Defensive: Should never happen. Don't create a blank doc on edit!
          toast({
            title: "Error",
            description: "Cannot update: selected ERP is missing an ID.",
            variant: "destructive",
          });
          setAiSaving(false);
          return;
        }
      } else {
        // Create new ERP with AI-reviewed data
        const newRef = doc(collection(db, "projects", PROJECT_ID, "erpProtocols"));
        await setDoc(newRef, { ...erpForm, ...aiData, id: newRef.id });
        toast({ title: "ERP Protocol created (AI reviewed)" });
      }

      // Reset all state
      setIsErpModalOpen(false);
      setEditingErp(null);
      setErpForm({ keywords: "", type: "", notify: [], protocol: "" });
      setAiAdvisorOpen(false);
      setAiAdvisorData(null);
      setAiOverrides({});
      setShowReviewChoice(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not save ERP Protocol",
        variant: "destructive",
      });
    } finally {
      setAiSaving(false);
    }
  };
  // Handles BOTH create and edit
        const handleERPFormSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          if (editingErp?.id) {
            // This is an EDIT
            setShowReviewChoice(true); // Show the review choice
            setErpSaveMode("edit");
    } else {
      // This is a CREATE - always do AI review by default
      setAiReviewLoading(true);
      setAiAdvisorOpen(true);
      setAiAdvisorData(null);

      const parsedNotify = notifyRaw.split(",").map(r => r.trim().toUpperCase()).filter(Boolean);
      const erpDraft = { ...erpForm, notify: parsedNotify };
      try {
        const resp = await fetch("/api/ai-erp-advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ erpDraft }),
        });
        const aiData = await resp.json();
        setAiAdvisorData(aiData);
      } catch (err) {
        setAiAdvisorData({ error: "AI analysis failed. Please try again." });
      } finally {
        setAiReviewLoading(false);
      }
      setErpSaveMode("create");
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
      <main className="container mx-auto max-w-6xl lg:max-w-7xl px-4 lg:px-8 py-6 lg:py-10">
        <Tabs value={tabValue} onValueChange={setTabValue} className="space-y-6 lg:space-y-8">
             
          
              {/* DESKTOP: Horizontal Tabs */}
              <div className="hidden sm:flex">
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
                  {/* --- Add other tabs here ... --- */}
                </TabsList>
              </div>

              {/* MOBILE: Dropdown Tabs */}
              <div className="block sm:hidden mb-4">
                <select
                  value={tabValue}
                  onChange={e => setTabValue(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white font-medium text-base focus:outline-none"
                >
                  <option value="project">Project Details</option>
                  <option value="contacts">Emergency Contacts</option>
                  <option value="erp">ERP Protocols</option>
                  <option value="assets">Assets & Equipment</option>
                  <option value="team">Team Assignments</option>
                  {/* --- Add other options here ... --- */}
                </select>
              </div>
                {/* --- PROJECT DETAILS --- */}
                <TabsContent value="project">
            <Card className="hydro-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-primary" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 lg:space-y-8 p-6 lg:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-2">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
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
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg lg:max-w-3xl w-full p-8 lg:p-10 max-h-[90vh] overflow-y-auto">
                      <h3 className="text-2xl lg:text-3xl font-bold text-hydro-dark mb-6 lg:mb-8 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-primary" /> Edit Project Info
                      </h3>
                      <form
                        onSubmit={handleProjectSave}
                        className="space-y-4 lg:space-y-6"
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

              <TabsContent value="contacts">
                <Card className="hydro-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-5 h-5 mr-2 text-primary" />
                        <span className="text-lg sm:text-xl font-bold">Emergency Contacts</span>
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
                        className="hydro-button-primary px-4 py-2 rounded-lg shadow"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add/Update Contact
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {contacts.length === 0 && (
                        <div className="p-6 text-center text-gray-400 italic">
                          No emergency contacts yet. Add your first one!
                        </div>
                      )}
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl mb-4 flex flex-col gap-2 transition-all duration-300"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{getContactIcon(contact.contactType)}</div>
                <div>
                  <div className="font-bold text-lg">{contact.contactType}</div>
                  <div className="text-gray-600 text-sm">{contact.name}</div>
                  <div className="mt-1 space-y-1">
                    <div
                      className="flex items-center text-sm text-blue-700 cursor-pointer hover:underline"
                      onClick={() => window.open(`tel:${contact.phone}`, "_self")}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      <span className="font-mono">{contact.phone}</span>
                    </div>
                    {contact.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        📧 {contact.email}
                      </div>
                    )}
                    {contact.responseTime && (
                      <div className="flex items-center text-sm text-green-600">
                        ⏱️ {contact.responseTime}
                      </div>
                    )}
                    {contact.lastVerified && (
                      <div className="flex items-center text-sm text-gray-400">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Last verified: {contact.lastVerified}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* BUTTON GROUP: Stack on mobile, row on desktop */}
              <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.open(`tel:${contact.phone}`, "_self")}
                >
                  <Phone className="w-4 h-4 mr-2" /> Call
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEditContact(contact)}
                >
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleDeleteContact(contact.id!)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remove
                </Button>
              </div>
            </div>
          ))}
                     
                    </div>
                    {/* Contact Modal */}
                    {isContactModalOpen && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg lg:max-w-2xl p-6 sm:p-8 lg:p-10 flex flex-col items-stretch relative max-h-[90vh] overflow-y-auto">
                          <h3 className="font-bold text-2xl lg:text-3xl mb-2 lg:mb-4 text-hydro-dark text-center">
                            {editingContact ? "Update Contact" : "Add Contact"}
                          </h3>
                          <div className="mb-4 text-center text-gray-600">
                            Enter key details for rapid response during emergencies.
                          </div>
                          <Form {...contactForm}>
                            <form onSubmit={contactForm.handleSubmit(saveContact)} className="space-y-4 lg:space-y-6">
                              <FormField
                                control={contactForm.control}
                                name="contactType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Contact Type</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="e.g., Hospital, Marine Rescue, Security, Fire Dept, Company Clinic, etc."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hydro-dark"
                                        autoFocus
                                        maxLength={48}
                                      />
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
                                      <Input
                                        placeholder="e.g., Warri Central Hospital"
                                        {...field}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                      />
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
                                      <Input
                                        placeholder="+234-XXX-XXX-XXXX"
                                        {...field}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                      />
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
                                      <Input
                                        placeholder="contact@organization.com"
                                        {...field}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                      />
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
                                      <Input
                                        placeholder="e.g., 25 minutes"
                                        {...field}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex gap-3 mt-4 justify-end">
                                <Button
                                  type="submit"
                                  className="hydro-button-primary font-bold px-7"
                                >
                                  {editingContact ? "Update Contact" : "Add Contact"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="px-7"
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
                                              <div className="bg-white rounded-xl shadow-2xl max-w-md lg:max-w-2xl w-full p-6 lg:p-8 max-h-[90vh] overflow-y-auto">
                                                <h3 className="text-xl lg:text-2xl font-bold text-hydro-dark mb-4 lg:mb-6">
                                                  {editingErp ? "Edit ERP Protocol" : "Add ERP Protocol"}
                                                </h3>
                                                <form onSubmit={handleERPFormSubmit} className="space-y-4 lg:space-y-6">
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
                                                    <Label>Roles to Notify (comma-separated)</Label>
                                                    <Input
                                                      value={notifyRaw}
                                                      onChange={e => setNotifyRaw(e.target.value)}
                                                      placeholder="GOLD, SILVER, BRONZE"
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
                                                    onClick={resetErpModals}
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
                                      
                                      {showReviewChoice && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-2">
                                          <div
                                            className="
                                              bg-white rounded-2xl shadow-2xl
                                              w-full max-w-sm sm:max-w-md lg:max-w-lg
                                              px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12
                                              border border-hydro-dark/10
                                              flex flex-col items-center
                                              animate-fade-in
                                              mx-auto
                                            "
                                            style={{ minWidth: 320, maxWidth: 480 }}
                                          >
                                            {/* Modern animated icon */}
                                            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-5">
                                              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" />
                                                <circle cx="12" cy="12" r="4" fill="currentColor" className="opacity-70" />
                                              </svg>
                                            </div>
                                            <h3 className="text-2xl lg:text-3xl font-bold text-hydro-dark text-center mb-2 lg:mb-4">Review With AI?</h3>
                                            <p className="text-base lg:text-lg text-gray-600 text-center mb-7 lg:mb-8 max-w-xs lg:max-w-sm">
                                              Would you like to <span className="text-blue-700 font-semibold">AI-review</span> this protocol before saving?
                                            </p>
                                            <div className="flex flex-col sm:flex-row w-full justify-center gap-3 lg:gap-4">
                                              <Button
                                                className="w-full sm:w-auto px-4 sm:px-6 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-xl shadow text-base flex items-center justify-center transition-all"
                                                onClick={async () => {
                                                  setShowReviewChoice(false);
                                                  setAiAdvisorOpen(true);
                                                  setAiReviewLoading(true);
                                                  setAiAdvisorData(null);
                                                  const parsedNotify = notifyRaw.split(",").map(r => r.trim().toUpperCase()).filter(Boolean);
                                                  const erpDraft = { ...erpForm, notify: parsedNotify };
                                                  try {
                                                    const resp = await fetch("/api/ai-erp-advisor", {
                                                      method: "POST",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({ erpDraft }),
                                                    });
                                                    const aiData = await resp.json();
                                                    setAiAdvisorData(aiData);
                                                  } catch (err) {
                                                    setAiAdvisorData({ error: "AI analysis failed. Please try again." });
                                                  } finally {
                                                    setAiReviewLoading(false);
                                                  }
                                                }}
                                              >
                                                <span className="mr-2">🤖</span>
                                                Yes, Review with AI
                                              </Button>
                                              <Button
                                                className="w-full sm:w-auto px-4 sm:px-6 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl shadow text-base flex items-center justify-center transition-all"
                                                onClick={saveERPDirectly}
                                              >
                                                <span className="mr-2">✅</span>
                                                No, Save Directly
                                              </Button>
                                              <Button
                                                className="w-full sm:w-auto px-4 sm:px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl border text-base flex items-center justify-center transition-all"
                                                variant="outline"
                                                onClick={resetErpModals}
                                              >
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {/* AI Check */}
                                      <AIERPAdvisorModal
                                        open={aiAdvisorOpen}
                                        onClose={resetErpModals}
                                        loading={aiReviewLoading}
                                        aiData={aiAdvisorData}
                                        aiOverrides={aiOverrides}
                                        setAiOverrides={setAiOverrides}
                                        aiSaving={aiSaving}
                                        onSave={async () => {
                                          setAiSaving(true);
                                          try {
                                            // Defensive: Only continue if aiData is present
                                            if (!aiAdvisorData) {
                                              toast({ title: "Error", description: "No AI suggestions to save." });
                                              setAiSaving(false);
                                              return;
                                            }

                                            // Grab current form values as fallback/defaults
                                            const currentForm = { ...erpForm };

                                            // Safely build final values for each field, prioritizing user overrides, then AI suggestions, then old form value
                                            const finalType =
                                              aiOverrides.type ??
                                              aiAdvisorData.corrections?.type ??
                                              currentForm.type;

                                            const finalKeywords =
                                              aiOverrides.improvedKeywords ??
                                              aiOverrides.keywords ??
                                              aiAdvisorData.improvedKeywords ??
                                              aiAdvisorData.corrections?.keywords ??
                                              currentForm.keywords;

                                            const parseNotify = (value: any): string[] => {
                                              if (Array.isArray(value)) return value.map(x => x.trim().toUpperCase());
                                              if (typeof value === "string") return value.split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
                                              return [];
                                            };

                                            let finalNotify: string[] = [];
                                            if (aiOverrides.notify) finalNotify = parseNotify(aiOverrides.notify);
                                            else if (aiAdvisorData.corrections?.notify) finalNotify = parseNotify(aiAdvisorData.corrections.notify);
                                            else if (currentForm.notify) finalNotify = parseNotify(currentForm.notify);
                                            else finalNotify = [];

                                            if (!finalNotify.length && notifyRaw) finalNotify = parseNotify(notifyRaw); // fallback to the current notifyRaw field
                                            const finalProtocol =
                                              aiOverrides.improvedProtocol ??
                                              aiOverrides.protocol ??
                                              aiAdvisorData.improvedProtocol ??
                                              aiAdvisorData.corrections?.protocol ??
                                              currentForm.protocol;

                                            // Compose the object to be saved
                                            const saveObj: ERPProtocol = {
                                              ...currentForm,
                                              type: finalType,
                                              keywords: finalKeywords,
                                              notify: finalNotify,
                                              protocol: finalProtocol,
                                            };

                                            // Save to Firestore
                                            if (editingErp?.id) {
                                              await updateDoc(
                                                doc(db, "projects", PROJECT_ID, "erpProtocols", editingErp.id),
                                                {
                                                  ...saveObj,
                                                  id: editingErp.id,
                                                }
                                              );
                                            } else {
                                              const newRef = doc(collection(db, "projects", PROJECT_ID, "erpProtocols"));
                                              await setDoc(newRef, {
                                                ...saveObj,
                                                id: newRef.id,
                                              });
                                            }

                                            toast({ title: "ERP Protocol updated (AI reviewed)" });

                                            setErpForm({ keywords: "", type: "", notify: [], protocol: "" });
                                            setAiAdvisorOpen(false);
                                            setIsErpModalOpen(false);
                                            setAiAdvisorData(null);
                                            setAiOverrides({});
                                            setEditingErp(null);
                                          } catch (err) {
                                            toast({
                                              title: "Error",
                                              description: "Could not save ERP Protocol",
                                              variant: "destructive",
                                            });
                                          } finally {
                                            setAiSaving(false);
                                          }
                                        }}
                                        onOverride={handleOverride}
                                      />
                                    </CardContent>
                                  </Card>
                                </TabsContent>

                                {/* --- ASSETS & EQUIPMENT TAB --- */}
                                <TabsContent value="assets">
                <Card className="hydro-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 mr-2 text-primary" />
                        <span className="text-lg sm:text-xl font-bold">Assets & Equipment</span>
                      </div>
                      <Button
                        onClick={() => {
                          if (assetModalUnlocked) {
                            setEditingAsset(null);
                            assetForm.reset({
                              name: "",
                              category: "",
                              modelSerial: "",
                              manufacturer: "",
                              year: "",
                              condition: "New",
                              assignedTo: "",
                              specs: "",
                              notes: "",
                            });
                            setIsAssetModalOpen(true);
                          } else {
                            setShowGoldAssetModal(true);
                          }
                        }}
                        className="hydro-button-primary px-4 py-2 rounded-lg shadow"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Asset
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  {showGoldAssetModal && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center">
                        <h3 className="font-bold text-xl mb-4 text-hydro-dark text-center">Gold Command Only</h3>
                        <p className="text-center text-gray-700 mb-2 font-medium">
                          Enter Gold Command Code to add assets & equipment.
                        </p>
                        <Input
                          type="password"
                          placeholder="Gold Code"
                          value={goldAssetCodeInput}
                          onChange={e => setGoldAssetCodeInput(e.target.value)}
                          className="mb-2"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === "Enter") handleGoldAssetUnlock();
                          }}
                        />
                        {goldAssetError && <div className="text-red-600 mt-1">{goldAssetError}</div>}
                        <div className="flex gap-2 mt-3">
                          <Button
                            className="w-32 bg-yellow-600 hover:bg-yellow-700 text-white"
                            onClick={handleGoldAssetUnlock}
                          >
                            Confirm
                          </Button>
                          <Button variant="outline" onClick={() => { setShowGoldAssetModal(false); setGoldAssetCodeInput(""); setGoldAssetError(""); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <CardContent>
                    <div className="space-y-4">
                      {assets.length === 0 && (
                        <div className="p-6 text-center text-gray-400 italic">
                          No assets/equipment logged yet. Add your first!
                        </div>
                      )}
                      {assets.map(asset => (
                        <div
                          key={asset.id}
                          className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-2xl border bg-white/80 shadow transition-all duration-300 hover:shadow-xl gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-base text-hydro-dark truncate">{asset.name}</div>
                            <div className="text-sm text-gray-700">{asset.category} | {asset.modelSerial}</div>
                            <div className="text-xs text-gray-500">{asset.manufacturer} ({asset.year})</div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[15px]">
                              <span className={`font-semibold ${asset.condition === "Needs Repair" ? "text-red-600" : "text-green-700"}`}>{asset.condition}</span>
                              {asset.assignedTo && (
                                <span className="text-gray-700">Assigned to: {asset.assignedTo}</span>
                              )}
                            </div>
                            {asset.specs && (
                              <div className="mt-2 text-xs text-gray-500 whitespace-pre-wrap">{asset.specs}</div>
                            )}
                            {asset.notes && (
                              <div className="mt-2 text-xs text-gray-400">{asset.notes}</div>
                            )}
                          </div>
                          {userCanEditAssets && (
                            <div className="flex gap-2 mt-3 md:mt-0">
                              <Button size="sm" variant="outline" className="font-semibold px-4"
                                onClick={() => handleEditAsset(asset)}>
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" className="font-semibold px-4"
                                onClick={() => handleDeleteAsset(asset.id!)}>
                                <Trash2 className="w-3 h-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
        
                      ))}
                    </div>

                    {/* Asset Modal */}
                    {isAssetModalOpen && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4 transition-all duration-300">
                          <div
                            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg lg:max-w-3xl p-6 lg:p-10 flex flex-col items-stretch relative animate-fade-in mx-2 my-6 overflow-y-auto"
                            style={{ maxHeight: '90vh' }}
                          >
                          <h3 className="font-bold text-2xl lg:text-3xl mb-2 lg:mb-4 text-hydro-dark dark:text-white text-center">
                            {editingAsset ? "Update Asset/Equipment" : "Add Asset/Equipment"}
                          </h3>
                          <Form {...assetForm}>
                            <form onSubmit={assetForm.handleSubmit(saveAsset)} className="space-y-4 lg:space-y-6">
                              <FormField control={assetForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Asset Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Dive Basket, Jack Sparrow" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={assetForm.control} name="category" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <FormControl>
                                    <select {...field} className="w-full border px-3 py-2 rounded-lg">
                                      <option value="">Select category...</option>
                                      <option>Vessel</option>
                                      <option>Tool</option>
                                      <option>Vehicle</option>
                                      <option>Sensor</option>
                                      <option>Compressor</option>
                                      <option>Chamber</option>
                                      <option>Deck Equipment</option>
                                      <option>Other</option>
                                    </select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={assetForm.control} name="modelSerial" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Model/Serial #</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., 12345, HD-2025-X" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormField control={assetForm.control} name="manufacturer" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Manufacturer</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g., Pommec, Stanley" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField control={assetForm.control} name="year" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Year</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g., 2022" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                              </div>
                              <FormField control={assetForm.control} name="condition" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Condition</FormLabel>
                                  <FormControl>
                                    <select {...field} className="w-full border px-3 py-2 rounded-lg">
                                      <option value="New">New</option>
                                      <option value="Good">Good</option>
                                      <option value="Fair">Fair</option>
                                      <option value="Needs Repair">Needs Repair</option>
                                    </select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={assetForm.control} name="assignedTo" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Assigned To / Location</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Deck, Workshop, Vessel, Team" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={assetForm.control} name="specs" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Specs</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Technical specs, dimensions, features, etc." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={assetForm.control} name="notes" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notes (Optional)</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Additional notes, inspection reminders, etc." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              {/* Attachments: See note below */}
                              <div className="flex gap-3 mt-4 justify-end">
                                <Button type="submit" className="hydro-button-primary font-bold px-7">
                                  {editingAsset ? "Update Asset" : "Add Asset"}
                                </Button>
                                <Button type="button" variant="outline" className="px-7" onClick={() => setIsAssetModalOpen(false)}>
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