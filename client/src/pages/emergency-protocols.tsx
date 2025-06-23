import React, { useState } from 'react';
import { Brain, MessageSquare, Send, Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ERPScenarioSearch } from '@/components/erp-scenario-search';

interface AIResponse {
  answer: string;
  relatedQuestions: string[];
  relatedScenarios: { id: string; title: string; category: string; }[];
  confidence: 'high' | 'medium' | 'low';
  source?: string;
}

export default function EmergencyProtocols() {
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAskAI = async () => {
    if (!question.trim()) {
      toast({
        title: "Question Required",
        description: "Please enter a question about emergency response procedures.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/erp/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      setAiResponse(data);
    } catch (error) {
      console.error('Error asking AI:', error);
      toast({
        title: "AI Assistant Unavailable",
        description: "Unable to get AI response. Please check your connection or try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      case 'low': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const commonQuestions = [
    "What should I do first when someone is seriously injured offshore?",
    "When should we abandon ship during a fire?",
    "How do we handle a man overboard situation?",
    "What are the steps for medical evacuation?",
    "How do we respond to a diving emergency?",
    "What if dynamic positioning system fails?",
    "How do we handle severe weather conditions?",
    "What is the role of Bronze Command in an emergency?"
  ];

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Emergency Response Protocols</h1>
        <p className="text-gray-600 mt-2">
          Access HydroDive's comprehensive emergency response procedures and AI-powered guidance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* AI Q&A Section */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Brain className="h-5 w-5" />
              AI Emergency Response Assistant
            </CardTitle>
            <CardDescription>
              Ask specific questions about emergency procedures and get intelligent, protocol-based answers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Example: What should I do if someone falls overboard?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[100px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleAskAI();
                  }
                }}
              />
              <Button 
                onClick={handleAskAI} 
                disabled={isLoading || !question.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Getting Answer...' : 'Ask AI Assistant'}
              </Button>
            </div>

            {/* Common Questions */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">Common Questions:</h4>
              <div className="grid grid-cols-1 gap-1">
                {commonQuestions.slice(0, 4).map((q, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="justify-start text-left h-auto py-2 px-3 text-xs text-blue-700 hover:bg-blue-100"
                    onClick={() => setQuestion(q)}
                  >
                    <MessageSquare className="h-3 w-3 mr-2 flex-shrink-0" />
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Response Section */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="h-5 w-5" />
              AI Response
            </CardTitle>
            <CardDescription>
              Intelligent guidance based on HydroDive's Emergency Response Plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {aiResponse ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={`flex items-center gap-1 ${getConfidenceColor(aiResponse.confidence)}`}>
                    {getConfidenceIcon(aiResponse.confidence)}
                    {aiResponse.confidence.charAt(0).toUpperCase() + aiResponse.confidence.slice(1)} Confidence
                  </Badge>
                  {aiResponse.source && (
                    <Badge variant="outline" className="text-xs">
                      Source: {aiResponse.source}
                    </Badge>
                  )}
                </div>

                <div className="prose prose-sm max-w-none">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {aiResponse.answer}
                    </div>
                  </div>
                </div>

                {aiResponse.relatedQuestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Related Questions:</h4>
                    <div className="space-y-1">
                      {aiResponse.relatedQuestions.slice(0, 3).map((q, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="justify-start text-left h-auto py-2 px-3 text-xs text-green-700 hover:bg-green-100"
                          onClick={() => setQuestion(q)}
                        >
                          <MessageSquare className="h-3 w-3 mr-2 flex-shrink-0" />
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {aiResponse.relatedScenarios.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Related Scenarios:</h4>
                    <div className="grid grid-cols-1 gap-1">
                      {aiResponse.relatedScenarios.map((scenario, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white rounded border border-green-200 text-xs"
                        >
                          <span className="font-medium text-gray-800">{scenario.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {scenario.category}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ask a question to get AI-powered emergency response guidance</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* ERP Scenario Search */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Emergency Scenario Database</h2>
        <p className="text-gray-600 mb-6">
          Search through detailed emergency response scenarios with step-by-step procedures
        </p>
        <ERPScenarioSearch />
      </div>
    </div>
  );
}