import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import {
  Settings,
  Phone,
  Users,
  FileText,
  Save,
  Edit,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Project, EmergencyContact } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// --- Contact Schema ---
const contactSchema = z.object({
  contactType: z.string().min(1, "Contact type is required"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  responseTime: z.string().optional(),
});

const defaultProject: Project = {
  id: 1,
  number: "863-01-24",
  name: "Forcados ACOE Decommissioning Project",
  client: "Shell Petroleum Development Company of Nigeria (SPDC)",
  contractor: "Century Ports & Terminals LTD (CPTL)",
  location: "Forcados, Nigeria",
  status: "ACTIVE",
  description: "Decommissioning of Forcados ACOE Temporary Export System",
};

export default function ProjectSetup() {
  // State
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [showProjectCodeModal, setShowProjectCodeModal] = useState(false);
  const [projectCodeInput, setProjectCodeInput] = useState("");
  const [projectCodeError, setProjectCodeError] = useState("");
  const [projectForm, setProjectForm] = useState<Project>(defaultProject);

  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Project Data Query
  const { data: project, refetch: refetchProject } = useQuery<Project | undefined>({
    queryKey: ["/api/projects/1"],
    queryFn: async () => {
      const response = await fetch("/api/projects/1");
      if (!response.ok) {
        if (response.status === 404) return undefined;
        throw new Error("Failed to fetch project");
      }
      return response.json();
    },
  });

  // Emergency Contacts Query
  const { data: emergencyContacts = [], refetch: refetchContacts } = useQuery<EmergencyContact[]>({
    queryKey: ["/api/emergency-contacts", { projectId: "1" }],
    queryFn: async () => {
      const response = await fetch("/api/emergency-contacts?projectId=1");
      if (!response.ok) {
        throw new Error("Failed to fetch emergency contacts");
      }
      return response.json();
    }
  });

  // Contact Form
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

  // Set projectForm on project load
  useEffect(() => {
    if (project) setProjectForm(project);
    else setProjectForm(defaultProject);
  }, [project]);

  // --- Project Info Handlers ---
  const handleProjectCodeCheck = () => {
    if (projectCodeInput === "000") {
      setIsEditingProject(true);
      setShowProjectCodeModal(false);
      setProjectCodeError("");
    } else {
      setProjectCodeError("Incorrect code.");
    }
  };

  const handleProjectSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/projects/${projectForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm),
      });
      
      if (!response.ok) throw new Error("Failed to update project");
      
      toast({ title: "Project info updated!", description: "Changes have been saved." });
      setIsEditingProject(false);
      refetchProject();
      queryClient.invalidateQueries({ queryKey: ["/api/projects/1"] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update project info.", variant: "destructive" });
    }
  };

  // --- Contacts Save Handler ---
  const saveContact = async (data: z.infer<typeof contactSchema>) => {
    try {
      const contactData = {
        ...data,
        projectId: 1,
      };

      if (editingContact) {
        const response = await fetch(`/api/emergency-contacts/${editingContact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactData),
        });
        if (!response.ok) throw new Error("Failed to update contact");
      } else {
        const response = await fetch("/api/emergency-contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactData),
        });
        if (!response.ok) throw new Error("Failed to create contact");
      }
      
      setIsContactModalOpen(false);
      setEditingContact(null);
      contactForm.reset();
      refetchContacts();
      toast({ title: "Success", description: "Emergency contact saved successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to save emergency contact", variant: "destructive" });
    }
  };

  // --- Contact Edit Handler ---
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

  // --- UI helpers ---
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

  // --- Demo User ---
  const user = {
    role: "GOLD",
    name: "David Mooney",
    title: "General Manager",
    initials: "DM"
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-hydro-light">
      <Header user={user} project={projectForm || defaultProject} />
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-hydro-dark">Project Setup</h1>
          <Button className="hydro-button-primary" onClick={handleProjectSave} disabled={!isEditingProject}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
        <Tabs defaultValue="project" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="project">Project Details</TabsTrigger>
            <TabsTrigger value="contacts">Emergency Contacts</TabsTrigger>
            <TabsTrigger value="assets">Assets & Equipment</TabsTrigger>
            <TabsTrigger value="team">Team Assignments</TabsTrigger>
          </TabsList>
          {/* -------- PROJECT INFO -------- */}
          <TabsContent value="project">
            <Card className="hydro-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-primary" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isEditingProject && (
                  <Button variant="outline" className="mb-4" onClick={() => setShowProjectCodeModal(true)}>
                    Edit Project Info (Gold Code)
                  </Button>
                )}
                <form onSubmit={handleProjectSave}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectNumber">Project Number</Label>
                      <Input
                        id="projectNumber"
                        value={projectForm.number || ""}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <div className="mt-1">
                        <Badge className="bg-green-100 text-green-800">{projectForm.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="projectName">Project Name</Label>
                    <Input
                      id="projectName"
                      value={projectForm.name || ""}
                      onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
                      readOnly={!isEditingProject}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="client">Client</Label>
                      <Input
                        id="client"
                        value={projectForm.client || ""}
                        onChange={e => setProjectForm(f => ({ ...f, client: e.target.value }))}
                        readOnly={!isEditingProject}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contractor">Contractor</Label>
                      <Input
                        id="contractor"
                        value={projectForm.contractor || ""}
                        onChange={e => setProjectForm(f => ({ ...f, contractor: e.target.value }))}
                        readOnly={!isEditingProject}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={projectForm.location || ""}
                      onChange={e => setProjectForm(f => ({ ...f, location: e.target.value }))}
                      readOnly={!isEditingProject}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={projectForm.description || ""}
                      onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
                      rows={3}
                      readOnly={!isEditingProject}
                    />
                  </div>
                  {isEditingProject && (
                    <div className="flex gap-2 mt-4">
                      <Button type="submit" className="hydro-button-primary">
                        Save Project Info
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditingProject(false);
                          setProjectForm(project || defaultProject);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </form>
                {/* Gold Code Modal */}
                {showProjectCodeModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                      <h3 className="text-lg font-bold mb-4 text-hydro-dark">Enter Gold Command Code</h3>
                      <Input
                        type="password"
                        placeholder="Enter code"
                        value={projectCodeInput}
                        onChange={e => setProjectCodeInput(e.target.value)}
                        className="mb-4"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === "Enter") handleProjectCodeCheck();
                        }}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleProjectCodeCheck} className="hydro-button-primary">
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowProjectCodeModal(false);
                            setProjectCodeInput("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      {projectCodeError && (
                        <div className="text-red-600 mt-2 text-sm font-medium">{projectCodeError}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* --------- CONTACTS ---------- */}
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
                  {emergencyContacts.map((contact) => (
                    <div key={contact.id} className="p-4 border rounded-lg bg-white shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">{getContactIcon(contact.contactType)}</div>
                          <div>
                            <h4 className="font-medium text-hydro-dark">{getContactTypeLabel(contact.contactType)}</h4>
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
                            onClick={() => {
                              // Implement removeContact(contact.id) as needed
                              toast({ title: "Remove not yet implemented" });
                            }}
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
                            <Button
                              type="submit"
                              className="flex-1 hydro-button-primary"
                              disabled={contactForm.formState.isSubmitting}
                            >
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
                        {/* --------- ASSETS & EQUIPMENT ---------- */}
                        <TabsContent value="assets">
                        <Card className="hydro-card">
                        <CardHeader>
                        <CardTitle className="flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-primary" />
                        Assets & Equipment
                        </CardTitle>
                        </CardHeader>
                        <CardContent>
                        <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-hydro-dark">Dive Support Vessel</h4>
                        <Badge className="bg-green-100 text-green-800">Operational</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                        <span className="text-gray-600">Last Inspection:</span>
                        <span className="ml-2 font-medium">Jan 22, 2025</span>
                        </div>
                        <div>
                        <span className="text-gray-600">Next Due:</span>
                        <span className="ml-2 font-medium">Jan 29, 2025</span>
                        </div>
                        <div>
                        <span className="text-gray-600">Certification:</span>
                        <span className="ml-2 font-medium">Valid</span>
                        </div>
                        <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 text-green-600 font-medium">Ready</span>
                        </div>
                        </div>
                        </div>
                        <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
                        <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-orange-900">Decompression Chamber</h4>
                        <Badge className="bg-orange-100 text-orange-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Attention Required
                        </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                        <span className="text-orange-700">Last Inspection:</span>
                        <span className="ml-2 font-medium">Jan 15, 2025</span>
                        </div>
                        <div>
                        <span className="text-orange-700">Next Due:</span>
                        <span className="ml-2 font-medium text-red-600">Overdue</span>
                        </div>
                        <div>
                        <span className="text-orange-700">Action Required:</span>
                        <span className="ml-2 font-medium">Schedule inspection</span>
                        </div>
                        <div>
                        <span className="text-orange-700">Priority:</span>
                        <span className="ml-2 text-orange-600 font-medium">High</span>
                        </div>
                        </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-hydro-dark">Emergency Equipment Kit</h4>
                        <Badge className="bg-gray-100 text-gray-800">Maintenance Scheduled</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                        <span className="text-gray-600">Inventory Check:</span>
                        <span className="ml-2 font-medium">Jan 20, 2025</span>
                        </div>
                        <div>
                        <span className="text-gray-600">Maintenance:</span>
                        <span className="ml-2 font-medium">Jan 26, 2025</span>
                        </div>
                        <div>
                        <span className="text-gray-600">Completeness:</span>
                        <span className="ml-2 font-medium">100%</span>
                        </div>
                        <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 text-green-600 font-medium">Ready</span>
                        </div>
                        </div>
                        </div>
                        </div>
                        </CardContent>
                        </Card>
                        </TabsContent>
                        {/* --------- TEAM ASSIGNMENTS ---------- */}
                        <TabsContent value="team">
                        <Card className="hydro-card">
                        <CardHeader>
                        <CardTitle className="flex items-center">
                        <Users className="w-5 h-5 mr-2 text-primary" />
                        Team Assignments
                        </CardTitle>
                        </CardHeader>
                        <CardContent>
                        <div className="space-y-4">
                        {/* GOLD Command */}
                        <div className="p-4 border rounded-lg role-gold-light">
                        <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-hydro-dark">GOLD Command</h4>
                        <Badge className="role-gold">Strategic</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">Overall incident management and strategic decisions</p>
                        <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gold text-gold-foreground rounded-full flex items-center justify-center font-medium">
                        FI
                        </div>
                        <div>
                        <p className="font-medium">Frank Ifedi</p>
                        <p className="text-sm text-gray-600">MD/CEO - Gold Manager</p>
                        </div>
                        </div>
                        </div>
                        {/* SILVER Command */}
                        <div className="p-4 border rounded-lg role-silver-light">
                        <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-hydro-dark">SILVER Command</h4>
                        <Badge className="role-silver">Tactical</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">Resource coordination and tactical oversight</p>
                        <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-silver text-silver-foreground rounded-full flex items-center justify-center font-medium">
                          DG
                        </div>
                        <div>
                          <p className="font-medium">Dean Golding Perello</p>
                          <p className="text-sm text-gray-600">Diving Manager</p>
                        </div>
                        </div>
                        <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-silver text-silver-foreground rounded-full flex items-center justify-center font-medium">
                          KA
                        </div>
                        <div>
                          <p className="font-medium">Kene Anyabolu</p>
                          <p className="text-sm text-gray-600">HSE Manager</p>
                        </div>
                        </div>
                        </div>
                        </div>
                        {/* BRONZE Command */}
                        <div className="p-4 border rounded-lg role-bronze-light">
                        <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-hydro-dark">BRONZE Command</h4>
                        <Badge className="role-bronze">Operational</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">On-scene operations and immediate response</p>
                        <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-bronze text-bronze-foreground rounded-full flex items-center justify-center font-medium">
                        NR
                        </div>
                        <div>
                        <p className="font-medium">Nick Roddy</p>
                        <p className="text-sm text-gray-600">Project Manager</p>
                        </div>
                        </div>
                        </div>
                        </div>
                        </CardContent>
                        </Card>
                        </TabsContent>
                        </Tabs>
                        </main>
                        </div>
                        );
                        }