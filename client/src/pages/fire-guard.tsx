import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Flame, MapPin, Calendar, Users, AlertTriangle, Shield, BookOpen } from 'lucide-react';
import type { FireIncident } from '@shared/fire-intel/schema';

export default function FireGuard() {
  const { data: incidents, isLoading } = useQuery<FireIncident[]>({
    queryKey: ['/api/fire-incidents'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="text-center py-12">
          <Flame className="h-12 w-12 mx-auto mb-4 text-orange-500 animate-pulse" />
          <p className="text-gray-600">Loading Fire Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="h-8 w-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Fire Guard (Fire Aladdin)</h1>
        </div>
        <p className="text-gray-600 mt-2">
          Historical fire intelligence from major offshore disasters - Learn from the past to protect the future
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50/40 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-900">AI-Powered Decision Support</p>
            <p className="text-xs text-orange-800 mt-1">
              This intelligence is automatically integrated into the AI ERP Advisor. When you ask fire-related questions, 
              the AI will reference these historical incidents to provide context-aware guidance based on similar conditions.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {incidents?.map((incident) => (
          <Card key={incident.id} className="border-orange-200 overflow-hidden" data-testid={`fire-incident-${incident.id}`}>
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl text-orange-900 flex items-center gap-2">
                    <Flame className="h-6 w-6" />
                    {incident.title}
                  </CardTitle>
                  <CardDescription className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {incident.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {incident.location}
                    </span>
                    {incident.fatalities !== undefined && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {incident.fatalities} fatalities
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge className="bg-red-100 text-red-800 border-red-300">
                    {incident.severity.toUpperCase()}
                  </Badge>
                  {incident.phase && (
                    <Badge variant="outline" className="text-xs">
                      {incident.phase}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Incident Overview</h3>
                <p className="text-gray-700 leading-relaxed">{incident.description}</p>
              </div>

              {/* Environmental Context */}
              {(incident.season || incident.weather || incident.windDirection) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Environmental Context
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {incident.season && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-700 font-medium">Season</p>
                          <p className="text-sm text-blue-900">{incident.season}</p>
                        </div>
                      )}
                      {incident.weather && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-700 font-medium">Weather</p>
                          <p className="text-sm text-blue-900">{incident.weather}</p>
                        </div>
                      )}
                      {incident.windDirection && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-700 font-medium">Wind Direction</p>
                          <p className="text-sm text-blue-900">{incident.windDirection}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Ignition Sources */}
              {incident.ignitionSources && incident.ignitionSources.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-600" />
                      Ignition Sources
                    </h3>
                    <ul className="space-y-2">
                      {incident.ignitionSources.map((source, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-orange-500 mt-1">•</span>
                          <span>{source}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Failed Barriers */}
              {incident.failedBarriers && incident.failedBarriers.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-600" />
                      Failed Safety Barriers
                    </h3>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <ul className="space-y-2">
                        {incident.failedBarriers.map((barrier, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-red-800">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{barrier}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {/* Lessons Learned */}
              {incident.lessons && incident.lessons.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-green-600" />
                      Lessons Learned
                    </h3>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <ul className="space-y-3">
                        {incident.lessons.map((lesson, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-green-900">
                            <span className="text-green-600 font-bold mt-0.5">{idx + 1}.</span>
                            <span className="text-sm leading-relaxed">{lesson}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {/* Citations */}
              {incident.citations && incident.citations.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">References & Citations</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {incident.citations.map((citation, idx) => (
                        <p key={idx} className="text-xs text-gray-600 leading-relaxed">
                          [{idx + 1}] {citation}
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}

        {incidents && incidents.length === 0 && (
          <div className="text-center py-12">
            <Flame className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No historical fire incidents loaded</p>
          </div>
        )}
      </div>
    </div>
  );
}
