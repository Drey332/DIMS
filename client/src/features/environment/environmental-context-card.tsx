import { useMemo, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  Globe2,
  Loader2,
  MapPin,
  Radio,
  Shield,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  lookupLocationIntel,
  DEFAULT_OPERATION_COORDINATES,
  type LocationIntel,
  type LocationRiskLevel,
  type IntelligenceConfidence,
} from "@shared/environment/locationIntel";
import { type AuroraEnvironmentalContext } from "@shared/environment/types";

interface EnvironmentalContextCardProps {
  locationName?: string;
  latitude?: number;
  longitude?: number;
}

export function EnvironmentalContextCard({ locationName, latitude, longitude }: EnvironmentalContextCardProps) {
  const locationIntel = useMemo<LocationIntel | undefined>(() => lookupLocationIntel(locationName), [locationName]);

  const resolvedLatitude = latitude ?? locationIntel?.latitude ?? DEFAULT_OPERATION_COORDINATES.latitude;
  const resolvedLongitude = longitude ?? locationIntel?.longitude ?? DEFAULT_OPERATION_COORDINATES.longitude;

  const { data, isLoading, isError, refetch } = useQuery<AuroraEnvironmentalContext>({
    queryKey: ["environmental-context", Number(resolvedLatitude.toFixed(3)), Number(resolvedLongitude.toFixed(3))],
    queryFn: async () => {
      const params = new URLSearchParams({
        lat: resolvedLatitude.toString(),
        lon: resolvedLongitude.toString(),
      });

      if (locationName) {
        params.append("location", locationName);
      }

      const response = await fetch(`/api/environment/aurora?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load auroral environmental context");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const severityStyles = useMemo(() => {
    if (!data) return "bg-slate-100 text-slate-700 border-slate-200";
    switch (data.estimatedKp.severity) {
      case "storm":
        return "bg-red-100 text-red-800 border-red-200";
      case "active":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  }, [data]);

  if (isLoading) {
    return (
      <Card className="border-slate-200 bg-slate-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Activity className="h-5 w-5" />
            Space Weather Context
          </CardTitle>
          <CardDescription>Loading auroral intelligence…</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="h-5 w-5" />
            Space Weather Context Unavailable
          </CardTitle>
          <CardDescription>We couldn&apos;t reach the auroral feed. Try again in a moment.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <Loader2 className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { hemisphericPower, estimatedKp, localEstimate, dataSource, analysis, maxProbability, summary, formattedObservationTime } = data;

  const insightIcon = estimatedKp.severity === "storm" ? AlertTriangle : estimatedKp.severity === "active" ? Zap : Radio;
  const locationLabel = locationIntel?.displayName ?? locationName;
  const riskBadgeStyles = locationIntel ? riskBadgeByLevel[locationIntel.riskLevel] : defaultRiskBadge;
  const confidenceStyles = locationIntel ? confidenceBadgeByLevel[locationIntel.confidence] : undefined;

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Activity className="h-5 w-5" />
            Operational Environment &amp; Space Weather
          </CardTitle>
          <Badge className={`border ${severityStyles} whitespace-nowrap`}>Kp {estimatedKp.value?.toFixed(1) ?? "--"}</Badge>
          {dataSource.fallbackUsed && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
              Archived snapshot
            </Badge>
          )}
          {locationIntel && (
            <Badge className={`border ${riskBadgeStyles} whitespace-nowrap`}>
              Risk: {formatLabel(locationIntel.riskLevel)}
            </Badge>
          )}
        </div>
        {locationLabel && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-blue-900">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">{locationLabel}</span>
            <Badge variant="outline" className="border-blue-200 bg-white/70 text-xs text-blue-800">
              {formatCoordinate(resolvedLatitude, "lat")} · {formatCoordinate(resolvedLongitude, "lon")}
            </Badge>
            {locationIntel?.coordinateSource === "parsed" && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-xs text-amber-800">
                Coordinates derived from request
              </Badge>
            )}
            {locationIntel?.coordinateSource === "fallback" && (
              <Badge variant="outline" className="border-slate-300 bg-slate-50 text-xs text-slate-700">
                Awaiting precise coordinates
              </Badge>
            )}
            {locationIntel && confidenceStyles && (
              <Badge variant="outline" className={`text-xs ${confidenceStyles}`}>
                Intel confidence: {formatLabel(locationIntel.confidence)}
              </Badge>
            )}
          </div>
        )}
        <CardDescription className="text-sm text-blue-800">{summary}</CardDescription>
        {locationIntel && (
          <div className="text-xs text-blue-700 font-medium flex flex-wrap items-center gap-2">
            <Globe2 className="h-3.5 w-3.5" />
            <span>{locationIntel.region}</span>
            {locationIntel.bodyOfWater && <span>• {locationIntel.bodyOfWater}</span>}
            {locationIntel.operationType && <span>• {locationIntel.operationType}</span>}
          </div>
        )}
        {formattedObservationTime && (
          <div className="text-xs text-blue-700 font-medium">
            Forecast timestamp: {formattedObservationTime}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {locationIntel && (
          <div className="rounded-lg border border-blue-200 bg-white/70 p-4 space-y-4">
            <p className="text-sm text-blue-900 leading-relaxed">{locationIntel.riskSummary}</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <IntelList
                icon={AlertOctagon}
                title="Key risk factors"
                items={locationIntel.riskFactors}
                tone="risk"
              />
              <IntelList
                icon={Shield}
                title="Protective measures to emphasise"
                items={locationIntel.protectiveMeasures}
                tone="mitigation"
              />
            </div>
            {locationIntel.supportingNotes?.length ? (
              <IntelList
                icon={Globe2}
                title="Operational notes"
                items={locationIntel.supportingNotes}
                tone="info"
              />
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatBlock
            icon={insightIcon}
            label="Geomagnetic posture"
            value={estimatedKp.description}
          />
          <StatBlock
            icon={Zap}
            label="Hemispheric power"
            value={buildPowerString(hemisphericPower.north, hemisphericPower.south)}
            helper={hemisphericPower.average ? `Avg ${hemisphericPower.average.toFixed(1)} ${hemisphericPower.units}` : undefined}
          />
          <StatBlock
            icon={Radio}
            label="Local probability"
            value={localEstimate?.probability !== null && localEstimate?.probability !== undefined ? `${localEstimate.probability.toFixed(1)}%` : "--"}
            helper={localEstimate?.summary}
          />
        </div>

        {analysis.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-white/70 p-4">
            <h4 className="mb-2 text-sm font-semibold text-blue-900 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Operational considerations
            </h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-blue-900">
              {analysis.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
          <div className="space-y-3">
            <div className="rounded-lg border border-blue-200 bg-white/60 p-4">
              <h4 className="text-sm font-semibold text-blue-900">Dataset summary</h4>
              <dl className="mt-3 space-y-2 text-sm text-blue-900">
                <div className="flex items-center justify-between">
                  <dt>Data source</dt>
                  <dd className="text-right font-medium">{dataSource.name}</dd>
                </div>
                {maxProbability && (
                  <div className="flex items-center justify-between">
                    <dt>Peak probability</dt>
                    <dd className="text-right font-medium">{maxProbability.probability.toFixed(1)}% @ {maxProbability.latitude.toFixed(1)}° / {maxProbability.longitude.toFixed(1)}°</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt>Attribution</dt>
                  <dd className="text-right text-xs text-blue-700 max-w-[200px]">
                    {dataSource.attribution}
                  </dd>
                </div>
                {dataSource.note && (
                  <div className="flex items-start justify-between gap-4 text-xs text-amber-700">
                    <dt className="font-medium">Note</dt>
                    <dd className="text-right">{dataSource.note}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <a href={dataSource.datasetUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Raw NOAA feed
                  </a>
                </Button>
                <Button asChild size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <a href={dataSource.mapUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    View interactive map
                  </a>
                </Button>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-blue-200 bg-slate-900/70 shadow-inner">
            <div className="relative pb-[56%]">
              <iframe
                title="Earth Nullschool aurora overlay"
                src={dataSource.mapUrl}
                loading="lazy"
                className="absolute left-0 top-0 h-full w-full border-0"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatBlockProps {
  icon: ElementType;
  label: string;
  value: string;
  helper?: string;
}

function StatBlock({ icon: Icon, label, value, helper }: StatBlockProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-white/70 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-slate-900">{value}</div>
      {helper && <div className="mt-1 text-xs text-blue-700">{helper}</div>}
    </div>
  );
}

function buildPowerString(north?: number | null, south?: number | null) {
  if (typeof north === "number" && typeof south === "number") {
    return `${north.toFixed(1)} / ${south.toFixed(1)} GW (N/S)`;
  }
  if (typeof north === "number") {
    return `${north.toFixed(1)} GW (north)`;
  }
  if (typeof south === "number") {
    return `${south.toFixed(1)} GW (south)`;
  }
  return "--";
}

const riskBadgeByLevel: Record<LocationRiskLevel, string> = {
  low: "border-emerald-300 bg-emerald-50 text-emerald-800",
  moderate: "border-amber-300 bg-amber-50 text-amber-900",
  elevated: "border-orange-300 bg-orange-50 text-orange-800",
  high: "border-red-300 bg-red-50 text-red-800",
  critical: "border-purple-300 bg-purple-50 text-purple-900",
};

const defaultRiskBadge = "border-blue-200 bg-white/70 text-blue-800";

const confidenceBadgeByLevel: Record<IntelligenceConfidence, string> = {
  high: "border-emerald-300 bg-emerald-50 text-emerald-800",
  medium: "border-amber-300 bg-amber-50 text-amber-900",
  low: "border-red-300 bg-red-50 text-red-800",
};

function formatCoordinate(value: number, type: "lat" | "lon") {
  const absolute = Math.abs(value).toFixed(3);
  const hemisphere = type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${absolute}° ${hemisphere}`;
}

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface IntelListProps {
  icon: ElementType;
  title: string;
  items: string[];
  tone: "risk" | "mitigation" | "info";
}

const intelToneStyles: Record<IntelListProps["tone"], { container: string; text: string }> = {
  risk: {
    container: "border-red-200 bg-red-50/70",
    text: "text-red-900",
  },
  mitigation: {
    container: "border-emerald-200 bg-emerald-50/70",
    text: "text-emerald-900",
  },
  info: {
    container: "border-blue-200 bg-blue-50/70",
    text: "text-blue-900",
  },
};

function IntelList({ icon: Icon, title, items, tone }: IntelListProps) {
  if (!items || items.length === 0) {
    return null;
  }

  const toneStyles = intelToneStyles[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneStyles.container}`}>
      <h4 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${toneStyles.text}`}>
        <Icon className="h-4 w-4" />
        {title}
      </h4>
      <ul className={`list-disc space-y-1 pl-5 text-sm ${toneStyles.text}`}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
