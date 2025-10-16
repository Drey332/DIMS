import React, { useEffect, useMemo, useState } from "react";
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
import { ERPScenarioSearch } from "@/components/erp-scenario-search";
import { EnvironmentalContextCard } from "@/components/environmental-context-card";
import { EnvIntelCard } from "@/components/env-intel-card";
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
import type { EnvContext } from "@shared/types/env";
import { useEnvIntelContext } from "@/hooks/use-env-intel";

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
  lessons: string[];
  officialFindings?: string[];
  sources?: IncidentSource[];
  score?: number;
  similarity?: number;
  boosts?: BoostContribution[];
}

interface AIResponse {
  answer: string;
  relatedQuestions?: string[];
  relatedScenarios?: { id: string; title: string; category: string }[];
  confidence: "high" | "medium" | "low";
  source?: string;
  matchedIncidents?: MatchedIncident[];
}

interface ProjectSummary {
  id: number;
  name: string;
  location: string;
  client: string;
  number?: string;
}

export default function EmergencyProtocols() {
  const [question, setQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load assigned projects
  const { data: projectsData, isLoading: projectsLoading } =
    useQuery<ProjectSummary[]>({
      queryKey: ["/api/user/projects"],
      queryFn: async () => {
        const response = await fetch("/api/user/projects");
        if (!response.ok) throw new Error("Failed to load assigned projects");
        return response.json();
      },
    });

  const projects = projectsData ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (!projectsLoading && projects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, projectsLoading, selectedProjectId]);

  const activeProject = useMemo(() => {
    if (projects.length === 0) return undefined;
    if (selectedProjectId === null) return projects[0];
    return projects.find((p) => p.id === selectedProjectId) ?? projects[0];
  }, [projects, selectedProjectId]);

  // Static geo intel -> base coords for stream & snapshot keys
  const locationIntel = useMemo(
    () => lookupLocationIntel(activeProject?.location),
    [activeProject?.location]
  );

  const resolvedLatitude =
    locationIntel?.latitude ?? DEFAULT_OPERATION_COORDINATES.latitude;
  const resolvedLongitude =
    locationIntel?.longitude ?? DEFAULT_OPERATION_COORDINATES.longitude;

  // Streamed live env intel (SSE-backed, with internal fallbacks)
  const { context: liveEnvIntel } = useEnvIntelContext(
    resolvedLatitude,
    resolvedLongitude
  );

  // Optional: access the last cached snapshot (if something else populated it)
  const environmentQueryKey = useMemo(
    () =>
      [
        "environmental-context",
        Number(resolvedLatitude.toFixed(3)),
        Number(resolvedLongitude.toFixed(3)),
      ] as const,
    [resolvedLatitude, resolvedLongitude]
  );

  const { data: environmentContext } = useQuery<EnvContext>({
    queryKey: environmentQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        lat: resolvedLatitude.toString(),
        lon: resolvedLongitude.toString(),
      });
      const response = await fetch(`/api/env-context?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load environmental context");
      }
      return response.json();
    },
    enabled: Number.isFinite(resolvedLatitude) && Number.isFinite(resolvedLongitude),
    staleTime: 60_000,
  });

  const handleAskAI = async () => {
    if (!question.trim()) {
      toast({
        title: "Question Required",
        description: "Please enter a question about emergency response procedures.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const contextSegments: string[] = [];

      // Project header
      if (activeProject?.name) {
        contextSegments.push(
          `Project: ${activeProject.name} (${activeProject.number ?? "no project number assigned"})`
        );
      }
      if (activeProject?.client) {
        contextSegments.push(`Client: ${activeProject.client}`);
      }
      if (activeProject?.location) {
        contextSegments.push(
          `Location: ${activeProject.location} [${resolvedLatitude.toFixed(3)}, ${resolvedLongitude.toFixed(3)}]`
        );
      }
      contextSegments.push(`Planning date (UTC): ${new Date().toISOString()}`);

      // Static regional intel
      if (locationIntel) {
        const risks = (locationIntel.riskFactors ?? []).slice(0, 3).join("; ");
        contextSegments.push(
          `Regional risk profile: ${locationIntel.riskLevel.toUpperCase()} (${locationIntel.confidence.toUpperCase()} confidence). Factors: ${
            risks || "n/a"
          }`
        );
      } else if (activeProject?.location) {
        contextSegments.push(
          `Regional risk profile: No catalogued intelligence for ${activeProject.location}. Treat as medium risk until briefed.`
        );
      }

      if (environmentContext) {
        const envAny = environmentContext as EnvContext & {
          wind?: { currentSpeed?: number };
          marine?: { currentSpeed?: number; waveHeights?: Array<{ height?: number }> };
        };
        const wind = envAny.wind?.currentSpeed ?? envAny.marine?.currentSpeed;
        const waves = envAny.marine?.waveHeights?.[0]?.height;
        const month = new Date().getUTCMonth() + 1;
        const north = resolvedLatitude >= 0;
        const seasonLookupNorth: Record<number, string> = {
          1: "winter",
          2: "winter",
          3: "spring",
          4: "spring",
          5: "spring",
          6: "summer",
          7: "summer",
          8: "summer",
          9: "fall",
          10: "fall",
          11: "fall",
          12: "winter",
        };
        const seasonLookupSouth: Record<number, string> = {
          1: "summer",
          2: "summer",
          3: "fall",
          4: "fall",
          5: "fall",
          6: "winter",
          7: "winter",
          8: "winter",
          9: "spring",
          10: "spring",
          11: "spring",
          12: "summer",
        };
        const season = north ? seasonLookupNorth[month] : seasonLookupSouth[month];
        contextSegments.push(
          `Env snapshot: wind=${wind ?? "n/a"} m/s; waveHeight=${waves ?? "n/a"} m; season=${season}; risk=${environmentContext.risk_level.toUpperCase()}`
        );
      }

      // Cached space-weather snapshot (if available)
      const snapshotEnv =
        queryClient.getQueryData<AuroraEnvironmentalContext>(
          environmentQueryKey
        );
      if (snapshotEnv) {
        const kpValue =
          snapshotEnv.estimatedKp.value != null
            ? snapshotEnv.estimatedKp.value.toFixed(1)
            : "unknown";
        const localProb =
          snapshotEnv.localEstimate?.probability != null
            ? `${snapshotEnv.localEstimate.probability.toFixed(1)}%`
            : "no local probability data";
        const topAnalysis = snapshotEnv.analysis?.[0] ?? "";
        contextSegments.push(
          `Space weather posture (snapshot): ${snapshotEnv.estimatedKp.description} (Kp ${kpValue}). Local auroral probability ${localProb}. ${topAnalysis}`.trim()
        );
      }

      // **Live** environment intel note (SSE)—preferred if present
      if (liveEnvIntel?.erp_note_md) {
        contextSegments.push(
          `Operational environment summary (live):\n${liveEnvIntel.erp_note_md}`
        );
      }

      const compiledContext = contextSegments.filter(Boolean).join("\n\n");

      const resp = await fetch("/api/erp/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          context: compiledContext || undefined,
          projectContext: {
            location: activeProject?.location,
            operationPhase: "production",
            project: activeProject
              ? {
                  id: activeProject.id,
                  name: activeProject.name,
                  number: activeProject.number,
                }
              : undefined,
          },
        }),
      });

      if (!resp.ok) throw new Error("Failed to get AI response");
      const data: AIResponse = await resp.json();
      setAiResponse({
        ...data,
        relatedQuestions: data.relatedQuestions ?? [],
        relatedScenarios: data.relatedScenarios ?? [],
      });
      setExpandedMatches({});
    } catch (err) {
      console.error("Error asking AI:", err);
      toast({
        title: "AI Assistant Unavailable",
        description:
          "Unable to get AI response. Please check your connection or try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMatchDetails = (id: string) => {
    setExpandedMatches((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <CheckCircle className="h-4 w-4" />;
      case "medium":
        return <Info className="h-4 w-4" />;
      case "low":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
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
    "What is the role of Bronze Command in an emergency?",
  ];

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Emergency Response Protocols
        </h1>
        <p className="text-gray-600 mt-2">
          Access HydroDive&apos;s comprehensive emergency response procedures and
          AI-powered guidance
        </p>
      </div>

      {/* Project selection */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Align intelligence to your active project
            </p>
            <p className="text-xs text-blue-800">
              Select the deployment you&apos;re drafting ERPs for so HydroSafe
              can surface the right location risks.
            </p>
          </div>
          <div className="w-full sm:w-[320px]">
            {projectsLoading ? (
              <div className="text-sm text-blue-700">
                Loading assigned projects…
              </div>
            ) : projects.length > 0 ? (
              <Select
                value={
                  selectedProjectId !== null
                    ? String(selectedProjectId)
                    : String(projects[0].id)
                }
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
                        <span className="text-xs text-muted-foreground">
                          {project.location}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-blue-700">
                No assigned projects. Showing global environmental defaults.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Static geo context (map/coords) */}
      <div className="mb-6">
        <EnvironmentalContextCard
          locationName={activeProject?.location}
          latitude={locationIntel?.latitude}
          longitude={locationIntel?.longitude}
        />
      </div>

      {/* Live environmental intel note (SSE-backed) */}
      <div className="mb-8">
        <EnvIntelCard
          latitude={resolvedLatitude}
          longitude={resolvedLongitude}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* AI Q&A */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Brain className="h-5 w-5" />
              AI Emergency Response Assistant
            </CardTitle>
            <CardDescription>
              Ask specific questions about emergency procedures and get
              intelligent, protocol-based answers
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
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
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
                {isLoading ? "Getting Answer..." : "Ask AI Assistant"}
              </Button>
            </div>

            {/* Common Questions */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">
                Common Questions:
              </h4>
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

        {/* AI Response */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="h-5 w-5" />
              AI Response
            </CardTitle>
            <CardDescription>
              Intelligent guidance based on HydroDive&apos;s Emergency Response Plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {aiResponse ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    className={`flex items-center gap-1 ${getConfidenceColor(
                      aiResponse.confidence
                    )}`}
                  >
                    {getConfidenceIcon(aiResponse.confidence)}
                    {aiResponse.confidence.charAt(0).toUpperCase() +
                      aiResponse.confidence.slice(1)}{" "}
                    Confidence
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
                                Similarity: {(
                                  match.score ?? match.similarity ?? 0
                                ).toFixed(2)}
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
                                  <li key={idx}>
                                    {boost.reason}
                                    {typeof boost.delta === "number"
                                      ? ` (+${boost.delta.toFixed(2)})`
                                      : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResponse.matchedIncidents &&
                  aiResponse.matchedIncidents[0]?.officialFindings &&
                  aiResponse.matchedIncidents[0].officialFindings.length > 0 && (
                    <div className="mt-4 text-xs text-gray-700">
                      <div className="font-semibold">Official Findings referenced:</div>
                      <ul className="list-disc pl-5">
                        {aiResponse.matchedIncidents[0].officialFindings
                          .slice(0, 3)
                          .map((finding, idx) => (
                            <li key={idx}>{finding}</li>
                          ))}
                      </ul>
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

                {aiResponse.relatedScenarios && aiResponse.relatedScenarios.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">
                      Related Scenarios:
                    </h4>
                    <div className="grid grid-cols-1 gap-1">
                      {aiResponse.relatedScenarios.map((scenario) => (
                        <div
                          key={scenario.id}
                          className="flex items-center justify-between p-2 bg-white rounded border border-green-200 text-xs"
                        >
                          <span className="font-medium text-gray-800">
                            {scenario.title}
                          </span>
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
                <p className="text-sm">
                  Ask a question to get AI-powered emergency response guidance
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* ERP Scenario Search */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Emergency Scenario Database
        </h2>
        <p className="text-gray-600 mb-6">
          Search through detailed emergency response scenarios with step-by-step
          procedures
        </p>
        <ERPScenarioSearch />
      </div>
    </div>
  );
}