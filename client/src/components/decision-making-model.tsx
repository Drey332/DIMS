import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Play, Bot, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DecisionStep {
  id: string;
  letter: string;
  title: string;
  description: string;
  isActive?: boolean;
}

const decisionSteps: DecisionStep[] = [
  {
    id: "information",
    letter: "I",
    title: "Information",
    description: "Gather information and intelligence"
  },
  {
    id: "assessment",
    letter: "A",
    title: "Assessment",
    description: "Assess threat, risk and develop strategy"
  },
  {
    id: "powers",
    letter: "P",
    title: "Powers & Policy",
    description: "Consider authority and regulations"
  },
  {
    id: "options",
    letter: "O",
    title: "Options",
    description: "Identify options and contingencies"
  },
  {
    id: "action",
    letter: "A",
    title: "Action",
    description: "Take action and implement decision",
    isActive: true
  },
  {
    id: "review",
    letter: "R",
    title: "Review",
    description: "Monitor outcomes and learn"
  }
];

export function DecisionMakingModel() {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [emergencyGuidance, setEmergencyGuidance] = useState<any>(null);
  const { toast } = useToast();

  // Medical emergency protocol mutation
  const medicalProtocolMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/protocol-guidance", {
        emergencyType: "MEDICAL_EMERGENCY",
        projectContext: {
          projectName: "Forcados ACOE Decommissioning Project",
          location: "Forcados Terminal, Nigeria",
          currentOperations: "Subsea cutting operations",
          weatherConditions: "Sea state 3, winds 15kt"
        },
        currentConditions: {
          timeOfDay: new Date().toLocaleString(),
          crewOnSite: 12,
          nearestHospital: "Lagos University Teaching Hospital",
          evacuationAssets: ["Bristow Helicopters"]
        }
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setEmergencyGuidance(data);
      toast({
        title: "Medical Emergency Protocol Generated",
        description: "AI has generated step-by-step medical emergency guidance based on current conditions.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate medical emergency protocol. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Safety incident reporting mutation
  const safetyIncidentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/incidents", {
        projectId: 1,
        title: "Safety Incident Report",
        description: "Initiated from AI emergency protocol system",
        type: "SAFETY",
        priority: "HIGH",
        status: "ACTIVE"
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Safety Incident Created",
        description: "Safety incident has been logged and emergency contacts notified.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create safety incident report.",
        variant: "destructive",
      });
    }
  });

  // Dynamic checklist generation mutation
  const checklistMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/checklist", {
        scenarioType: "EMERGENCY_RESPONSE",
        projectDetails: {
          name: "Forcados ACOE Decommissioning Project",
          location: "Nigeria",
          operations: "Offshore decommissioning"
        },
        userRole: "BRONZE"
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Dynamic Checklist Generated",
        description: `Generated ${Array.isArray(data) ? data.length : 'multiple'} emergency response actions based on current scenario.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate dynamic checklist.",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* AI Emergency Protocol Guidance */}
      <Card className="hydro-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-hydro-dark flex items-center">
            <Brain className="text-primary mr-3" />
            AI Emergency Protocol Guidance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <Bot className="text-blue-600 text-lg mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Proactive Safety Recommendations</h4>
                <p className="text-sm text-blue-800 mb-3">Based on current project conditions and weather data, I've identified potential risks:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Weather window closing in 6 hours - consider accelerating critical operations</li>
                  <li>• Hospital evacuation route verification needed (last checked 3 days ago)</li>
                  <li>• Backup communication system test due within 24 hours</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              className="w-full bg-red-600 text-white hover:bg-red-700 transition-colors"
              onClick={() => medicalProtocolMutation.mutate()}
              disabled={medicalProtocolMutation.isPending}
            >
              <div className="flex items-center justify-center">
                {medicalProtocolMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  "🚑"
                )}
                {medicalProtocolMutation.isPending ? "Generating..." : "Initiate MEDEVAC Protocol"}
              </div>
            </Button>
            <Button 
              className="w-full bg-orange-600 text-white hover:bg-orange-700 transition-colors"
              onClick={() => safetyIncidentMutation.mutate()}
              disabled={safetyIncidentMutation.isPending}
            >
              <div className="flex items-center justify-center">
                {safetyIncidentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  "⚠️"
                )}
                {safetyIncidentMutation.isPending ? "Creating..." : "Report Safety Incident"}
              </div>
            </Button>
            <Button 
              className="w-full hydro-button-primary"
              onClick={() => checklistMutation.mutate()}
              disabled={checklistMutation.isPending}
            >
              <div className="flex items-center justify-center">
                {checklistMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  "📋"
                )}
                {checklistMutation.isPending ? "Generating..." : "Generate Dynamic Checklist"}
              </div>
            </Button>
          </div>
          
          {/* Display Emergency Guidance Results */}
          {emergencyGuidance && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-bold text-red-900 mb-3">🚨 {emergencyGuidance.protocol}</h4>
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-red-800 mb-1">Time Standards:</h5>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {emergencyGuidance.timeStandards?.map((standard: string, idx: number) => (
                      <li key={idx}>{standard}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-red-800 mb-1">Required Actions:</h5>
                  <div className="space-y-2">
                    {emergencyGuidance.requiredActions?.slice(0, 3).map((action: any, idx: number) => (
                      <div key={idx} className="flex items-center text-sm text-red-700">
                        <Badge variant="outline" className="mr-2 text-xs">
                          {action.priority}
                        </Badge>
                        {action.description}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-red-600 mt-2">
                  Risk Assessment: {emergencyGuidance.riskAssessment}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Decision Making Model Framework */}
      <Card className="hydro-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-hydro-dark flex items-center">
            <div className="text-primary mr-3">🔄</div>
            Decision Making Model (I-A-P-O-A-R)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {decisionSteps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  step.isActive
                    ? 'bg-green-50 border border-green-200'
                    : selectedStep === step.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedStep(selectedStep === step.id ? null : step.id)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3 ${
                  step.isActive
                    ? 'bg-green-600 text-white'
                    : 'bg-primary text-white'
                }`}>
                  {step.letter}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${step.isActive ? 'text-green-800' : 'text-hydro-dark'}`}>
                    {step.title}
                  </div>
                  <div className={`text-sm ${step.isActive ? 'text-green-700' : 'text-gray-600'}`}>
                    {step.description}
                  </div>
                </div>
                {step.isActive && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    Current Step
                  </Badge>
                )}
              </div>
            ))}
          </div>
          
          <Button className="w-full mt-4 hydro-button-primary">
            <Play className="w-4 h-4 mr-2" />
            Start Decision Process
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
