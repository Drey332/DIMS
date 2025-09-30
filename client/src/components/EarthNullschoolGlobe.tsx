import { Globe2, MapPin, RefreshCcw } from "lucide-react";
import { useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EarthNullschoolGlobeProps {
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

function formatCoordinate(value: number, type: "lat" | "lon") {
  const suffix = type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(2)}°${suffix}`;
}

function isValidCoordinate(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function EarthNullschoolGlobe({ latitude, longitude, locationName }: EarthNullschoolGlobeProps) {
  const hasCoordinates = isValidCoordinate(latitude) && isValidCoordinate(longitude);

  const iframeSrc = useMemo(() => {
    if (!hasCoordinates) return undefined;
    const lat = latitude!.toFixed(3);
    const lon = longitude!.toFixed(3);

    // Embed the orthographic globe centred on the project coordinates as recommended in
    // https://earth.nullschool.net documentation. Animation is disabled to minimise load.
    return `https://earth.nullschool.net/#current/space/primary/waves/anim=off/overlay=aurora/orthographic=${lon},${lat},231`;
  }, [hasCoordinates, latitude, longitude]);

  if (!hasCoordinates) {
    return (
      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Globe2 className="h-5 w-5" />
            Earth Nullschool Globe
          </CardTitle>
          <CardDescription className="text-sm text-blue-800">
            Provide coordinates for this project to explore live atmospheric and ocean overlays.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-900">
            Once latitude and longitude are saved with the engagement, HydroSafe will load an interactive
            Nullschool globe centred on your worksite so you can verify conditions while drafting ERPs.
          </p>
        </CardContent>
      </Card>
    );
  }

  const coordinateBadge = `${formatCoordinate(latitude!, "lat")} · ${formatCoordinate(longitude!, "lon")}`;

  return (
    <Card className="border-blue-200 bg-white/70">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Globe2 className="h-5 w-5" />
              Earth Nullschool Globe
            </CardTitle>
            <CardDescription className="text-sm text-blue-800">
              Interactive auroral, wind, and ocean overlays sourced from earth.nullschool.net.
            </CardDescription>
          </div>
          {iframeSrc && (
            <Button asChild size="sm" variant="outline" className="gap-2">
              <a href={iframeSrc} target="_blank" rel="noreferrer">
                <RefreshCcw className="h-4 w-4" />
                Open full view
              </a>
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-blue-900">
          {locationName && (
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin className="h-3.5 w-3.5" />
              {locationName}
            </span>
          )}
          <Badge variant="outline" className="border-blue-200 bg-blue-50/60 uppercase tracking-wide">
            {coordinateBadge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {iframeSrc && (
          <div className="overflow-hidden rounded-lg border border-blue-200 shadow-sm">
            <iframe
              title="Earth Nullschool Globe"
              src={iframeSrc}
              className="h-[420px] w-full"
              loading="lazy"
              allowFullScreen
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
