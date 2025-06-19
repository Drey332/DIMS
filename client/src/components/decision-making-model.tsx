import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DecisionStep {
  id: string;
  letter: string;
  title: string;
  description: string;
  isActive?: boolean;
}

export function DecisionMakingModel() {
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const decisionSteps: DecisionStep[] = [
    {
      id: "information",
      letter: "I",
      title: "Information",
      description: "Gather all relevant facts about the emergency situation"
    },
    {
      id: "assessment",
      letter: "A",
      title: "Assessment",
      description: "Evaluate the severity and potential impact of the situation"
    },
    {
      id: "powers",
      letter: "P",
      title: "Powers",
      description: "Identify authority levels and decision-making powers required"
    },
    {
      id: "options",
      letter: "O",
      title: "Options",
      description: "Consider all available response options and alternatives"
    },
    {
      id: "action",
      letter: "A",
      title: "Action",
      description: "Execute the chosen response plan with clear assignments"
    },
    {
      id: "review",
      letter: "R",
      title: "Review",
      description: "Monitor effectiveness and adjust response as needed"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-6 mb-8">
      
      {/* Decision Making Model Framework */}
      <Card className="hydro-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-hydro-dark">
            IAPOAR Decision Making Model
          </CardTitle>
          <p className="text-sm text-hydro-gray">
            Structured decision-making framework for emergency response situations
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decisionSteps.map((step) => (
              <div
                key={step.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  activeStep === step.id
                    ? "border-hydro-blue bg-blue-50"
                    : "border-gray-200 hover:border-hydro-blue hover:bg-gray-50"
                }`}
                onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-hydro-blue text-white rounded-full flex items-center justify-center font-bold">
                    {step.letter}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-hydro-dark">{step.title}</h3>
                    <p className="text-sm text-hydro-gray mt-1">{step.description}</p>
                  </div>
                </div>
                
                {activeStep === step.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button size="sm" className="hydro-button-primary">
                      <Play className="w-4 h-4 mr-2" />
                      Execute Step
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-hydro-light rounded-lg">
            <h4 className="font-semibold text-hydro-dark mb-2">Framework Guidelines</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-hydro-gray">
              <div>
                <Badge variant="outline" className="mb-2">Bronze Level</Badge>
                <p>On-scene tactical decisions and immediate response actions</p>
              </div>
              <div>
                <Badge variant="outline" className="mb-2">Silver Level</Badge>
                <p>Operational coordination and resource management decisions</p>
              </div>
              <div>
                <Badge variant="outline" className="mb-2">Gold Level</Badge>
                <p>Strategic policy decisions and external stakeholder management</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}