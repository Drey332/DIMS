import { useState } from "react";
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
  MapPin, 
  Phone, 
  Users, 
  FileText,
  Save,
  Edit,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Project, EmergencyContact } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const contactSchema = z.object({
  contactType: z.string().min(1, "Contact type is required"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  responseTime: z.string().optional(),
});

export default function ProjectSetup() {
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects/1"], // Forcados project
  });

  const { data: emergencyContacts = [] } = useQuery<EmergencyContact[]>({
    queryKey: ["/api/emergency-contacts", { projectId: 1 }],
  });

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

  const saveContactMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contactSchema>) => {
      const payload = {
        ...data,
        projectId: 1,
      };
      
      if (editingContact) {
        await apiRequest("PUT", `/api/emergency-contacts/${editingContact.id}`, payload);
      } else {
        await apiRequest("POST", "/api/emergency-contacts", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts"] });
      setIsContactModalOpen(false);
      setEditingContact(null);
      contactForm.reset();
      toast({
        title: "Success",
        description: "Emergency contact saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save emergency contact",
        variant: "destructive",
      });
    },
  });

  const user = {
    role: "GOLD",
    name: "David Mooney",
    title: "General Manager",
    initials: "DM"
  };

  const projectData = {
    name: "Forcados ACOE Decommissioning Project",
    number: "863-01-24",
    client: "Shell Petroleum Development Company (SPDC)"
  };

  // Default project and contact data for Forcados
  const defaultProject = {
    id: 1,
    number: "863-01-24",
    name: "Forcados ACOE Decommissioning Project",
    client: "Shell Petroleum Development Company of Nigeria (SPDC)",
    contractor: "Century Ports & Terminals LTD (CPTL)",
    location: "Forcados, Nigeria",
    status: "ACTIVE",
    description: "Decommissioning of Forcados ACOE Temporary Export System",
  };

  const defaultContacts = [
    {
      id: 1,
      projectId: 1,
      contactType: "HOSPITAL",
      name: "Warri Central Hospital",
      phone: "+234-803-XXX-XXXX",
      email: "emergency@warricentral.ng",
      responseTime: undefined,
      lastVerified: "2025-01-20",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 2,
      projectId: 1,
      contactType: "MEDEVAC",
      name: "Nigeria Air Rescue",
      phone: "+234-805-XXX-XXXX",
      email: "dispatch@nigeriaairrescue.com",
      responseTime: "25 minutes",
      lastVerified: "2025-01-18",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 3,
      projectId: 1,
      contactType: "MARINE_RESCUE",
      name: "Nigerian Maritime Rescue",
      phone: "+234-807-XXX-XXXX",
      email: "ops@nimasa.gov.ng",
      responseTime: undefined,
      lastVerified: "2025-01-15",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const displayProject = project || defaultProject;
  const displayContacts = emergencyContacts.length > 0 ? emergencyContacts : defaultContacts;

  const onSubmitContact = (data: z.infer<typeof contactSchema>) => {
    saveContactMutation.mutate(data);
  };

  const handleEditContact = (contact: any) => {
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

  const getContactTypeLabel = (type: string) => {
    switch (type) {
      case 'HOSPITAL':
        return 'Primary Hospital';
      case 'MEDEVAC':
        return 'MEDEVAC Service';
      case 'MARINE_RESCUE':
        return 'Marine Rescue';
      case 'POLICE':
        return 'Police';
      case 'COAST_GUARD':
        return 'Coast Guard';
      default:
        return type;
    }
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'HOSPITAL':
        return '🏥';
      case 'MEDEVAC':
        return '🚁';
      case 'MARINE_RESCUE':
        return '⚓';
      case 'POLICE':
        return '🚔';
      case 'COAST_GUARD':
        return '🚢';
      default:
        return '📞';
    }
  };

  return (
    <div className="min-h-screen bg-hydro-light">
      <Header user={user} project={projectData} />
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-hydro-dark">Project Setup</h1>
          <Button className="hydro-button-primary">
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

          <TabsContent value="project">
            <Card className="hydro-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-primary" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="projectNumber">Project Number</Label>
                    <Input id="projectNumber" value={displayProject.number} readOnly className="bg-gray-50" />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <div className="mt-1">
                      <Badge className="bg-green-100 text-green-800">{displayProject.status}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input id="projectName" value={displayProject.name} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client">Client</Label>
                    <Input id="client" value={displayProject.client} />
                  </div>
                  <div>
                    <Label htmlFor="contractor">Contractor</Label>
                    <Input id="contractor" value={displayProject.contractor} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={displayProject.location} />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={displayProject.description} rows={3} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                      contactForm.reset();
                      setIsContactModalOpen(true);
                    }}
                    className="hydro-button-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {displayContacts.map((contact) => (
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
                              <div className="flex items-center text-sm text-gray-600 cursor-pointer hover:text-green-600 transition-colors"
                                   onClick={() => window.open(`tel:${contact.phone}`, '_self')}>
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
                            onClick={() => window.open(`tel:${contact.phone}`, '_self')}
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
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Contact Form Modal */}
                {isContactModalOpen && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                      <h3 className="text-xl font-bold text-hydro-dark mb-4">
                        {editingContact ? 'Update Contact' : 'Add Contact'}
                      </h3>
                      
                      <Form {...contactForm}>
                        <form onSubmit={contactForm.handleSubmit(onSubmitContact)} className="space-y-4">
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
                              disabled={saveContactMutation.isPending}
                            >
                              {saveContactMutation.isPending ? "Saving..." : (editingContact ? "Update Contact" : "Add Contact")}
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
