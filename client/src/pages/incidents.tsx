import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { PhotoUploadModal } from "@/components/photo-upload-modal";
import { 
  AlertTriangle, 
  Plus, 
  Clock, 
  User, 
  MapPin,
  Eye,
  Camera,
  CheckCircle2,
  AlertCircle,
  Brain,
  FileText,
  Shield
} from "lucide-react";
import { Incident, IncidentAction } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getAIRecommendations, type IncidentInput } from "@/utils/ai-recommendations";

const incidentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Type is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  projectId: z.number().default(1),
});

export default function Incidents() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: incidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: incidentActions = [] } = useQuery<IncidentAction[]>({
    queryKey: ["/api/incidents", selectedIncident?.id, "actions"],
    enabled: !!selectedIncident,
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof incidentSchema>) => {
      await apiRequest("POST", "/api/incidents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setIsCreateModalOpen(false);
      toast({
        title: "Success",
        description: "Incident created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create incident",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof incidentSchema>>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "",
      priority: "MEDIUM",
      projectId: 1,
    },
  });

  const analyzeIncident = async (incidentData: any) => {
    setIsAnalyzing(true);
    try {
      const incidentInput: IncidentInput = {
        title: incidentData.title,
        description: incidentData.description || "",
        category: incidentData.type === "Accident" ? "Accident" : 
                 incidentData.type === "Near Miss" ? "NearMiss" :
                 incidentData.type === "Hazard" ? "Hazard" : "Observation",
        attachments: []
      };
      
      const analysis = await getAIRecommendations(incidentInput);
      setAiAnalysis(analysis);
      setShowAiPanel(true);
      
      toast({
        title: "AI Analysis Complete",
        description: `Incident classified as Tier ${analysis.severity.tier} - ${analysis.severity.escalation}`,
      });
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: "Failed to analyze incident with AI",
        variant: "destructive",
      });
    }
    setIsAnalyzing(false);
  };

  const onSubmit = (data: z.infer<typeof incidentSchema>) => {
    createIncidentMutation.mutate(data);
  };

  const user = {
    role: "GOLD",
    name: "David Mooney",
    title: "General Manager",
    initials: "DM"
  };

  const project = {
    name: "Forcados ACOE Decommissioning Project",
    number: "863-01-24",
    client: "Shell Petroleum Development Company (SPDC)"
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'priority-critical border';
      case 'HIGH':
        return 'priority-high border';
      case 'MEDIUM':
        return 'priority-medium border';
      case 'LOW':
        return 'priority-low border';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'RESOLVED':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div>
      <main>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-hydro-dark">Incident Management</h1>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="hydro-button-emergency">
                <Plus className="w-4 h-4 mr-2" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Report New Incident</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incident Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief description of incident" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incident Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select incident type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MEDICAL">Medical Emergency</SelectItem>
                            <SelectItem value="EQUIPMENT">Equipment Failure</SelectItem>
                            <SelectItem value="WEATHER">Weather Related</SelectItem>
                            <SelectItem value="OPERATIONAL">Operational Issue</SelectItem>
                            <SelectItem value="SAFETY">Safety Violation</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Detailed description..." rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        const formData = form.getValues();
                        if (formData.title && formData.type) {
                          analyzeIncident(formData);
                        } else {
                          toast({
                            title: "Missing Information",
                            description: "Please fill in title and type before analyzing",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={isAnalyzing}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 hydro-button-primary"
                      disabled={createIncidentMutation.isPending}
                    >
                      {createIncidentMutation.isPending ? "Creating..." : "Create Incident"}
                    </Button>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incidents List */}
          <div className="lg:col-span-2">
            <Card className="hydro-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                  Active Incidents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading incidents...</div>
                ) : incidents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No incidents reported
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className={cn(
                          "rounded-lg p-4 cursor-pointer transition-colors",
                          getPriorityColor(incident.priority),
                          selectedIncident?.id === incident.id ? "ring-2 ring-primary" : ""
                        )}
                        onClick={() => setSelectedIncident(incident)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(incident.status)}
                            <h4 className="font-medium">{incident.title}</h4>
                          </div>
                          <Badge variant="outline">
                            {incident.priority}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>Type: <span className="font-medium">{incident.type}</span></div>
                          <div>Status: <span className="font-medium">{incident.status}</span></div>
                          <div>
                            <Clock className="w-3 h-3 inline mr-1" />
                            Started: {new Date(incident.startTime).toLocaleString()}
                          </div>
                          <div>
                            <User className="w-3 h-3 inline mr-1" />
                            Reporter: System
                          </div>
                        </div>
                        {incident.description && (
                          <p className="text-sm text-gray-700 mt-2">{incident.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis Panel */}
          <div>
            {showAiPanel && aiAnalysis ? (
              <Card className="hydro-card border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-blue-600" />
                      AI Analysis
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAiPanel(false)}
                    >
                      ×
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Severity Classification */}
                  <div>
                    <h4 className="font-medium text-hydro-dark mb-2 flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Severity Classification
                    </h4>
                    <div className={cn(
                      "p-3 rounded-lg border-l-4",
                      aiAnalysis.severity.tier === 3 ? "bg-red-50 border-l-red-500" :
                      aiAnalysis.severity.tier === 2 ? "bg-orange-50 border-l-orange-500" :
                      aiAnalysis.severity.tier === 1 ? "bg-yellow-50 border-l-yellow-500" :
                      "bg-green-50 border-l-green-500"
                    )}>
                      <div className="font-medium text-sm">
                        Tier {aiAnalysis.severity.tier} - {
                          aiAnalysis.severity.tier === 3 ? "Strategic Response" :
                          aiAnalysis.severity.tier === 2 ? "Operational Response" :
                          aiAnalysis.severity.tier === 1 ? "Tactical Response" : "Business as Usual"
                        }
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {aiAnalysis.severity.escalation}
                      </div>
                    </div>
                  </div>

                  {/* Corrective Actions */}
                  <div>
                    <h4 className="font-medium text-hydro-dark mb-2 flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Recommended Actions ({aiAnalysis.actions.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {aiAnalysis.actions.map((action: string, index: number) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          <div className="flex items-start">
                            <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-gray-700">{action}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documentation Requirements */}
                  <div>
                    <h4 className="font-medium text-hydro-dark mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Documentation Status
                    </h4>
                    <div className={cn(
                      "p-3 rounded-lg",
                      aiAnalysis.documentation.complete ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    )}>
                      <div className="font-medium text-sm">
                        {aiAnalysis.documentation.complete ? "✓ Complete" : "⚠ Missing Documentation"}
                      </div>
                      {!aiAnalysis.documentation.complete && aiAnalysis.documentation.missingItems.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {aiAnalysis.documentation.missingItems.map((item: string, index: number) => (
                            <div key={index} className="text-xs">• {item}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Command Hierarchy */}
                  <div>
                    <h4 className="font-medium text-hydro-dark mb-2">Command Structure</h4>
                    <div className="space-y-2 text-sm">
                      <div className={cn(
                        "flex items-center justify-between p-2 rounded",
                        aiAnalysis.severity.tier >= 1 ? "bg-bronze/20" : "bg-gray-100"
                      )}>
                        <span>Bronze (On-Scene):</span>
                        <span className="font-medium">Nick Roddy</span>
                      </div>
                      <div className={cn(
                        "flex items-center justify-between p-2 rounded",
                        aiAnalysis.severity.tier >= 2 ? "bg-silver/20" : "bg-gray-100"
                      )}>
                        <span>Silver (Tactical):</span>
                        <span className="font-medium">Dean Golding</span>
                      </div>
                      <div className={cn(
                        "flex items-center justify-between p-2 rounded",
                        aiAnalysis.severity.tier >= 3 ? "bg-gold/20" : "bg-gray-100"
                      )}>
                        <span>Gold (Strategic):</span>
                        <span className="font-medium">David Mooney</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button className="w-full hydro-button-primary" size="sm">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="sm"
                      onClick={() => {
                        // Re-analyze with updated information
                        const formData = form.getValues();
                        if (formData.title && formData.type) {
                          analyzeIncident(formData);
                        }
                      }}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Re-analyze
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="hydro-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Incident Details</span>
                    {selectedIncident && (
                      <Button
                        size="sm"
                        onClick={() => setIsPhotoModalOpen(true)}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Photo
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                {selectedIncident ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-hydro-dark mb-2">Incident Information</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">ID:</span>
                          <span className="ml-2 font-medium">#{selectedIncident.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <span className="ml-2 font-medium">{selectedIncident.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Priority:</span>
                          <Badge className="ml-2" variant="outline">
                            {selectedIncident.priority}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className="ml-2 font-medium">{selectedIncident.status}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Started:</span>
                          <span className="ml-2">{new Date(selectedIncident.startTime).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-hydro-dark mb-2">Command Assignment</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between p-2 bg-bronze/10 rounded">
                          <span>Bronze Controller:</span>
                          <span className="font-medium">Nick Roddy</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-silver/10 rounded">
                          <span>Silver Controller:</span>
                          <span className="font-medium">Dean Golding</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gold/10 rounded">
                          <span>Gold Controller:</span>
                          <span className="font-medium">David Mooney</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-hydro-dark mb-2">Actions</h4>
                      <div className="space-y-2">
                        <Button className="w-full hydro-button-primary" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View Full Details
                        </Button>
                        <Button className="w-full bg-orange-600 text-white hover:bg-orange-700" size="sm">
                          Update Status
                        </Button>
                        <Button className="w-full bg-green-600 text-white hover:bg-green-700" size="sm">
                          Close Incident
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Select an incident to view details
                  </div>
                )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        incidentId={selectedIncident?.id}
        projectId={1}
      />
    </div>
  );
}
