import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Compass,
  Loader2,
  RefreshCcw,
  Sparkles,
  Sun,
  Waves,
  Wind,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchAuroraForecast,
  fetchMarineConditions,
  fetchSolarWind,
  fetchWindConditions,
  type AuroraForecastResult,
  type MarineConditions,
  type SolarWindMetrics,
  type WindConditions,
} from "@/features/environment/environmental-data";

interface SpaceWeatherWidgetProps {
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

function isValidCoordinate(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const severityStyles: Record<"quiet" | "active" | "storm", string> = {
  quiet: "border-emerald-200 bg-emerald-50 text-emerald-700",
  active: "border-amber-200 bg-amber-50 text-amber-800",
  storm: "border-red-200 bg-red-50 text-red-800",
};

interface WindSparklineProps {
  points?: Array<{ time: string; speed: number }>;
}

function WindSparkline({ points }: WindSparklineProps) {
  const cleaned = (points ?? []).filter((point) => typeof point.speed === "number");
  if (!cleaned.length) {
    return null;
  }

  const maxSpeed = Math.max(...cleaned.map((point) => point.speed));
  const minSpeed = Math.min(...cleaned.map((point) => point.speed));
  const range = maxSpeed - minSpeed || 1;
  const width = 180;
  const height = 48;

  const path = cleaned
    .map((point, index) => {
      const x = (index / (cleaned.length - 1 || 1)) * width;
      const normalised = (point.speed - minSpeed) / range;
      const y = height - normalised * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full text-blue-500" aria-hidden>
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpaceWeatherWidget({ latitude, longitude, locationName }: SpaceWeatherWidgetProps) {
  const hasCoordinates = isValidCoordinate(latitude) && isValidCoordinate(longitude);

  const {
    data: aurora,
    isLoading: auroraLoading,
    isError: auroraError,
    refetch: refetchAurora,
  } = useQuery<AuroraForecastResult>({
    queryKey: ["space-weather", "aurora", latitude?.toFixed(2), longitude?.toFixed(2)],
    queryFn: () => fetchAuroraForecast(latitude!, longitude!),
    enabled: hasCoordinates,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const {
    data: solarWind,
    isLoading: solarWindLoading,
    isError: solarWindError,
    refetch: refetchSolarWind,
  } = useQuery<SolarWindMetrics>({
    queryKey: ["space-weather", "solar-wind"],
    queryFn: fetchSolarWind,
    enabled: hasCoordinates,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const {
    data: wind,
    isLoading: windLoading,
    isError: windError,
    refetch: refetchWind,
  } = useQuery<WindConditions>({
    queryKey: ["space-weather", "wind", latitude?.toFixed(2), longitude?.toFixed(2)],
    queryFn: () => fetchWindConditions(latitude!, longitude!),
    enabled: hasCoordinates,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const {
    data: marine,
    isLoading: marineLoading,
    isError: marineError,
    refetch: refetchMarine,
  } = useQuery<MarineConditions>({
    queryKey: ["space-weather", "marine", latitude?.toFixed(2), longitude?.toFixed(2)],
    queryFn: () => fetchMarineConditions(latitude!, longitude!),
    enabled: hasCoordinates,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const isLoading = auroraLoading || solarWindLoading || windLoading || marineLoading;
  const hasError = auroraError || solarWindError || windError || marineError;

  const formattedTimestamp = useMemo(() => {
    return formatTimestamp(aurora?.forecastTime ?? aurora?.observationTime);
  }, [aurora?.forecastTime, aurora?.observationTime]);

  if (!hasCoordinates) {
    return (
      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Activity className="h-5 w-5" />
            Space Weather &amp; Local Conditions
          </CardTitle>
          <CardDescription className="text-blue-800">
            Save latitude and longitude for this project to surface auroral risk, solar wind, and local wind/current
            intelligence here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Activity className="h-5 w-5" />
            Space Weather &amp; Local Conditions
          </CardTitle>
          <CardDescription>Checking NOAA and Open-Meteo feeds…</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (hasError || !aurora || !solarWind || !wind || !marine) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            Environmental feeds unavailable
          </CardTitle>
          <CardDescription>
            We couldn&apos;t reach one of the NOAA or Open-Meteo feeds. Please retry in a few moments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              refetchAurora();
              refetchSolarWind();
              refetchWind();
              refetchMarine();
            }}
          >
            <RefreshCcw className="h-4 w-4" />
            Retry data fetches
          </Button>
        </CardContent>
      </Card>
    );
  }

  const auroraSeverityBadge = severityStyles[aurora.severity] ?? severityStyles.quiet;
  const auroraProbability = aurora.probability ?? aurora.nearestPoint?.probability ?? aurora.maxProbability;
  const formattedProbability =
    typeof auroraProbability === "number" ? `${Math.round(auroraProbability)}%` : "N/A";
  const marineWaveHeights = marine.waveHeights ?? [];
  const currentWaveHeight = marineWaveHeights[0]?.height;
  const maxWaveHeight = marineWaveHeights.length
    ? Math.max(...marineWaveHeights.map((entry) => entry.height))
    : undefined;

  return (
    <Card className="border-blue-200 bg-white/70">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Activity className="h-5 w-5" />
            Space Weather &amp; Local Conditions
          </CardTitle>
          <Badge variant="outline" className={`text-xs font-semibold ${auroraSeverityBadge}`}>
            Kp {aurora.kpIndex?.toFixed(1) ?? "--"}
          </Badge>
          {formattedTimestamp && (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">
              Forecast: {formattedTimestamp}
            </Badge>
          )}
        </div>
        {locationName && (
          <CardDescription className="text-blue-800">
            Conditions for <span className="font-medium">{locationName}</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Sparkles className="h-4 w-4" />
              Aurora probability
            </div>
            <div className="text-3xl font-bold text-blue-900">{formattedProbability}</div>
            <p className="text-xs text-blue-800">
              Derived from NOAA SWPC OVATION aurora map at the nearest grid cell.
            </p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Sun className="h-4 w-4" />
              Solar wind
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm text-blue-900">
              <div>
                <div className="text-xs text-blue-700">Speed</div>
                <div className="font-semibold">{solarWind.speedKmPerSec?.toFixed(0) ?? "--"} km/s</div>
              </div>
              <div>
                <div className="text-xs text-blue-700">Density</div>
                <div className="font-semibold">{solarWind.densityPerCubicCm?.toFixed(1) ?? "--"} p/cm³</div>
              </div>
              <div>
                <div className="text-xs text-blue-700">Temperature</div>
                <div className="font-semibold">{solarWind.temperatureKelvin?.toFixed(0) ?? "--"} K</div>
              </div>
            </div>
            {solarWind.observationTime && (
              <p className="text-xs text-blue-700">Observed {formatTimestamp(solarWind.observationTime)}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Wind className="h-4 w-4" />
              Surface wind
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-blue-900">
                {wind.currentSpeed?.toFixed(1) ?? "--"} m/s
              </span>
              {wind.currentDirection !== undefined && (
                <span className="text-xs text-blue-700 flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5" />
                  {Math.round(wind.currentDirection)}°
                </span>
              )}
            </div>
            <WindSparkline points={wind.hourlySpeeds} />
            <p className="text-xs text-blue-700">
              24-hour forecast from Open-Meteo (10 m wind). Values are shown in metres per second.
            </p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Waves className="h-4 w-4" />
              Marine currents
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-blue-900">
              <div>
                <div className="text-xs text-blue-700">Current speed</div>
                <div className="font-semibold">{marine.currentSpeed?.toFixed(2) ?? "--"} m/s</div>
              </div>
              <div>
                <div className="text-xs text-blue-700">Direction</div>
                <div className="font-semibold">
                  {marine.currentDirection !== undefined ? `${Math.round(marine.currentDirection)}°` : "--"}
                </div>
              </div>
            </div>
            {marineWaveHeights.length ? (
              <div className="text-xs text-blue-700">
                Wave height (next 24h):
                {" "}
                {currentWaveHeight !== undefined ? `${currentWaveHeight.toFixed(1)} m now` : "--"}
                {maxWaveHeight !== undefined ? `, peak near ${maxWaveHeight.toFixed(1)} m.` : "."}
              </div>
            ) : (
              <div className="text-xs text-blue-700">Wave height data unavailable.</div>
            )}
            <p className="text-xs text-blue-700">
              Marine currents from Open-Meteo Marine API. Accuracy near coastlines may vary.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
