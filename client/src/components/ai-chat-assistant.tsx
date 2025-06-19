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
      content: 'Hello! I\'m your AI assistant for reports and audit trail analysis. I can help you generate incident reports, analyze audit logs, create compliance summaries, and provide insights from your emergency response data.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const { toast } = useToast();

  // Report Generation
  const reportGenerationMutation = useMutation({
    mutationFn: async (reportType: string) => {
      const response = await apiRequest("/api/ai/generate-report", "POST", {
        reportType,
        projectContext: {
          projectName: "Forcados ACOE Decommissioning Project",
          location: "Forcados Terminal, Nigeria",
          dateRange: "Last 30 days"
        }
      });
      return response;
    },
    onSuccess: (data) => {
      const message: AIMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Report generated successfully. The ${data.reportType} report includes:\n\n${data.summary}\n\nKey findings:\n${data.keyFindings?.slice(0, 3).map((finding: string, idx: number) => `${idx + 1}. ${finding}`).join('\n')}`,
        timestamp: new Date(),
        protocolData: data
      };
      setMessages(prev => [...prev, message]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive",
      });
    }
  });

  // Audit Analysis
  const auditAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/ai/audit-analysis", "POST", {
        analysisType: "COMPLIANCE_REVIEW",
        dateRange: "last_30_days",
        projectId: 1
      });
      return response;
    },
    onSuccess: (data) => {
      const message: AIMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Audit analysis complete. Found ${data.totalEvents || 0} events with ${data.complianceScore || 95}% compliance score. Key areas reviewed: incident response times, documentation completeness, and protocol adherence.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, message]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to analyze audit trail.",
        variant: "destructive",
      });
    }
  });

  // Compliance Summary
  const complianceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/ai/compliance-summary", "POST", {
        projectId: 1,
        timeframe: "monthly",
        standards: ["IMCA", "IOGP", "HydroDive"]
      });
      return response;
    },
    onSuccess: (data) => {
      const message: AIMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Compliance summary generated. Overall score: ${data.overallScore || 95}%. IMCA compliance: ${data.imcaScore || 98}%, IOGP compliance: ${data.iogpScore || 94}%, HydroDive protocols: ${data.hydroDiveScore || 96}%. All regulatory requirements met for reporting period.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, message]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate compliance summary.",
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