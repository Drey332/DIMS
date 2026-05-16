import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain,
  MessageSquare,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ERPScenarioSearch } from "@/features/erp/erp-scenario-search";
import { EnvironmentalContextCard } from "@/features/environment/environmental-context-card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  lookupLocationIntel,
  DEFAULT_OPERATION_COORDINATES,
} from "@shared/environment/locationIntel";
import { type AuroraEnvironmentalContext } from "@shared/environment/types";

interface IncidentSource {
  title: string;
  url: string;
}

interface BoostContribution {
  reason: string;
  delta: number;
}

interface MatchedIncident {
  id: string;
  title: string;
  location?: string;
  dateUtc?: string;
  operationPhase?: string;
  lessons?: string[];
  officialFindings?: string[];
  sources?: IncidentSource[];
  score?: number;
  similarity?: number;
  boosts?: BoostContribution[];
  reasons?: string[];
  ignitionSources?: string[];
  failedBarriers?: string[];
}

interface AIResponse {
  answer: string;
  relatedQuestions: string[];
  relatedScenarios: { id: string; title: string; category: string }[];
  source?: string;
  matchedIncidents?: MatchedIncident[];
  confidence: "high" | "medium" | "low";
}

interface ProjectSummary {
  id: number;
  name: string;
  location: string;
  client: string;
  number?: string;
}

export default function EmergencyProtocols() {
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: projectsLoading } = useQuery<ProjectSummary[]>({
    queryKey: ['/api/user/projects'],
    queryFn: async () => {
      const response = await fetch('/api/user/projects');
      if (!response.ok) {
        throw new Error('Failed to load assigned projects');
      }
      return response.json();
    }
  });

  const projects = projectsData ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  useEffect(() => {
    if (!projectsLoading && projects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, projectsLoading, selectedProjectId]);

  const activeProject = useMemo(() => {
    if (projects.length === 0) return undefined;
    if (selectedProjectId === null) {
      return projects[0];
    }
    return projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  }, [projects, selectedProjectId]);

  const locationIntel = useMemo(() => lookupLocationIntel(activeProject?.location), [activeProject?.location]);
  const resolvedLatitude = locationIntel?.latitude ?? DEFAULT_OPERATION_COORDINATES.latitude;
  const resolvedLongitude = locationIntel?.longitude ?? DEFAULT_OPERATION_COORDINATES.longitude;
  const environmentQueryKey = useMemo(
    () => ['environmental-context', Number(resolvedLatitude.toFixed(3)), Number(resolvedLongitude.toFixed(3))] as const,
    [resolvedLatitude, resolvedLongitude]
  );

  const toggleMatchDetails = useCallback((matchId: string) => {
    setExpandedMatches((current) => ({
      ...current,
      [matchId]: !current[matchId],
    }));
  }, []);

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
      const contextSegments: string[] = [];
      if (activeProject) {
        contextSegments.push(
          `Project: ${activeProject.name} (${activeProject.number ?? 'no project number assigned'}), Client: ${activeProject.client}. Location: ${activeProject.location}.`
        );
      }

      if (locationIntel) {
        const riskBullet = locationIntel.riskFactors.slice(0, 3).join('; ');
        const mitigationBullet = locationIntel.protectiveMeasures.slice(0, 2).join('; ');
        contextSegments.push(
          `Operational intelligence: Risk level ${locationIntel.riskLevel.toUpperCase()} (${locationIntel.confidence.toUpperCase()} confidence). Key factors: ${riskBullet || 'No catalogued risk factors.'} Mitigation focus: ${mitigationBullet || 'Confirm mitigations with site leadership.'}`
        );
      } else if (activeProject?.location) {
        contextSegments.push(`Operational intelligence: No catalogued risk profile for ${activeProject.location}. Treat as medium risk until briefed.`);
      }

      const environmentContext = queryClient.getQueryData<AuroraEnvironmentalContext>(environmentQueryKey);
      if (environmentContext) {
        const kpValue = environmentContext.estimatedKp.value !== null && environmentContext.estimatedKp.value !== undefined
          ? environmentContext.estimatedKp.value.toFixed(1)
          : 'unknown';
        const localProbability = environmentContext.localEstimate?.probability !== null && environmentContext.localEstimate?.probability !== undefined
          ? `${environmentContext.localEstimate.probability.toFixed(1)}%`
          : 'no local probability data';
        const topAnalysis = environmentContext.analysis[0] ?? '';
        contextSegments.push(
          `Space weather posture: ${environmentContext.estimatedKp.description} (Kp ${kpValue}). Local auroral probability ${localProbability}. ${topAnalysis}`.trim()
        );
      }

      const compiledContext = contextSegments.filter(Boolean).join('\n\n');

      const response = await fetch('/api/erp/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          context: compiledContext || undefined,
        }),
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

      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900">Align intelligence to your active project</p>
            <p className="text-xs text-blue-800">Select the deployment you&apos;re drafting ERPs for so HydroSafe can surface the right location risks.</p>
          </div>
          <div className="w-full sm:w-[320px]">
            {projectsLoading ? (
              <div className="text-sm text-blue-700">Loading assigned projects…</div>
            ) : projects.length > 0 ? (
              <Select
                value={selectedProjectId !== null ? String(selectedProjectId) : String(projects[0].id)}
                onValueChange={(value) => setSelectedProjectId(Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{project.name}</span>
                        <span className="text-xs text-muted-foreground">{project.location}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-blue-700">No assigned projects. Showing global environmental defaults.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <EnvironmentalContextCard
          locationName={activeProject?.location}
          latitude={locationIntel?.latitude}
          longitude={locationIntel?.longitude}
        />
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

                {aiResponse.matchedIncidents && aiResponse.matchedIncidents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">
                      Matched Past Incidents:
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {aiResponse.matchedIncidents.map((match) => (
                        <div
                          key={match.id}
                          className="rounded border border-amber-200 bg-amber-50/60 p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-amber-900">
                                {match.title}
                              </div>
                              <div className="text-xs text-amber-800">
                                {match.location ?? "Location unknown"} — {" "}
                                {match.dateUtc
                                  ? new Date(match.dateUtc).toUTCString().slice(5, 16)
                                  : "Date unknown"}
                                {" "}- Phase: {match.operationPhase ?? "n/a"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-amber-700">
                                Similarity: {(match.score ?? match.similarity ?? 0).toFixed(2)}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-900 hover:text-amber-700"
                                onClick={() => toggleMatchDetails(match.id)}
                              >
                                {expandedMatches[match.id] ? "Hide reasoning" : "Show reasoning"}
                              </Button>
                            </div>
                          </div>
                          {match.lessons && match.lessons.length > 0 && (
                            <ul className="mt-2 list-disc pl-5 text-xs text-amber-900">
                              {match.lessons.slice(0, 2).map((lesson, idx) => (
                                <li key={idx}>{lesson}</li>
                              ))}
                            </ul>
                          )}
                          {match.sources && match.sources.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {match.sources.slice(0, 3).map((source, idx) => (
                                <a
                                  key={idx}
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] underline text-amber-900 hover:text-amber-700"
                                >
                                  {source.title.length > 42
                                    ? `${source.title.slice(0, 42)}…`
                                    : source.title}
                                </a>
                              ))}
                            </div>
                          )}
                          {expandedMatches[match.id] && match.boosts && match.boosts.length > 0 && (
                            <div className="mt-3 rounded border border-amber-200 bg-white/70 p-2 text-[11px] text-amber-900">
                              <div className="font-semibold uppercase tracking-wide text-amber-800">
                                Why this match
                              </div>
                              <ul className="mt-1 space-y-1">
                                {match.boosts.map((boost, idx) => (
                                  <li key={idx}>{`${boost.reason} (+${(boost.delta * 100).toFixed(0)}%)`}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}



                {aiResponse.relatedQuestions && aiResponse.relatedQuestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">
                      Related Questions:
                    </h4>
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
