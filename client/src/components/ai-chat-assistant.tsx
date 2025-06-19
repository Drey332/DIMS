import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, X, Send, Loader2, AlertTriangle, FileText, Stethoscope } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AIMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  protocolData?: any;
}

export function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your emergency response AI co-pilot. I can help with MEDEVAC protocols, safety incidents, dynamic checklists, and emergency guidance following IMCA and IOGP standards.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const { toast } = useToast();

  // MEDEVAC Protocol
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
      const message: AIMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `🚨 **${data.protocol}**\n\n**Time Standards:**\n${data.timeStandards?.join('\n')}\n\n**Required Actions:**\n${data.requiredActions?.slice(0, 3).map((action: any, idx: number) => `${idx + 1}. [${action.priority}] ${action.description} (${action.estimatedTime})`).join('\n')}\n\n**Risk Assessment:** ${data.riskAssessment}`,
        timestamp: new Date(),
        protocolData: data
      };
      setMessages(prev => [...prev, message]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate MEDEVAC protocol.",
        variant: "destructive",
      });
    }
  });

  // Safety Incident
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
      const message: AIMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: '✅ **Safety Incident Created**\n\nSafety incident has been logged and emergency contacts have been notified. The incident is now tracked in the system with ID reference for follow-up actions.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, message]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create safety incident report.",
        variant: "destructive",
      });
    }
  });

  // Dynamic Checklist
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
      const message: AIMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `📋 **Dynamic Emergency Checklist Generated**\n\n${Array.isArray(data) ? data.slice(0, 5).map((item: any, idx: number) => `${idx + 1}. [${item.priority}] ${item.description}\n   ⏱️ ${item.estimatedTime} | 📖 ${item.protocolReference}`).join('\n\n') : 'Checklist items generated successfully'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, message]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate dynamic checklist.",
        variant: "destructive",
      });
    }
  });

  const handleQuickAction = (action: string) => {
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: action,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    switch (action) {
      case 'Initiate MEDEVAC Protocol':
        medicalProtocolMutation.mutate();
        break;
      case 'Report Safety Incident':
        safetyIncidentMutation.mutate();
        break;
      case 'Generate Dynamic Checklist':
        checklistMutation.mutate();
        break;
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Simple AI response for custom messages
    setTimeout(() => {
      const aiMessage: AIMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I understand you're asking about: "${inputValue}". For emergency protocols, please use the quick action buttons below. I can help with MEDEVAC procedures, safety incident reporting, and dynamic checklists based on IMCA D 014 and IOGP standards.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);

    setInputValue('');
  };

  const clearProtocol = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  return (
    <>
      {/* Floating AI Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            <Bot className="w-6 h-6 text-white" />
          </Button>
        )}
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] z-50 bg-white rounded-lg shadow-2xl border">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
              <CardTitle className="text-lg flex items-center">
                <Bot className="w-5 h-5 mr-2 text-blue-600" />
                AI Emergency Co-Pilot
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                      {message.protocolData && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-xs text-red-600 hover:text-red-800"
                          onClick={() => clearProtocol(message.id)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Clear Protocol
                        </Button>
                      )}
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-t bg-gray-50">
                <div className="text-xs text-gray-600 mb-2">Quick Actions:</div>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs justify-start"
                    onClick={() => handleQuickAction('Initiate MEDEVAC Protocol')}
                    disabled={medicalProtocolMutation.isPending}
                  >
                    {medicalProtocolMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Stethoscope className="w-3 h-3 mr-1" />
                    )}
                    MEDEVAC Protocol
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs justify-start"
                    onClick={() => handleQuickAction('Report Safety Incident')}
                    disabled={safetyIncidentMutation.isPending}
                  >
                    {safetyIncidentMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 mr-1" />
                    )}
                    Report Incident
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs justify-start"
                    onClick={() => handleQuickAction('Generate Dynamic Checklist')}
                    disabled={checklistMutation.isPending}
                  >
                    {checklistMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <FileText className="w-3 h-3 mr-1" />
                    )}
                    Dynamic Checklist
                  </Button>
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Ask about emergency procedures..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}