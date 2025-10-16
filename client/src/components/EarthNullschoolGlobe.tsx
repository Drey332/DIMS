import { useEffect, useMemo, useState } from "react";
import { Globe2, MapPin, RotateCcw, Settings, Share2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

type AnimationSetting = "on" | "off";
type ProjectionSetting =
  | "orthographic"
  | "equirectangular"
  | "azimuthal-eq"
  | "polar"
  | "satellite";
type OverlaySetting =
  | "aurora"
  | "wind"
  | "temp"
  | "rh"
  | "mslp"
  | "tpw"
  | "misery"
  | "waves";
type DomainSetting = "space" | "earth";
type SurfaceSetting = "primary" | "secondary" | "surface" | "overlay";
type FieldSetting =
  | "waves"
  | "wind"
  | "temp"
  | "rh"
  | "mslp"
  | "tpw"
  | "misery"
  | "mag"
  | "no2"
  | "o3";

type LocaleSetting = "en" | "fr" | "es" | "de" | "ja";

type Preset = {
  label: string;
  value: {
    domain: DomainSetting;
    surface: SurfaceSetting;
    field: FieldSetting;
    overlay: OverlaySetting;
    projection: ProjectionSetting;
  };
};

const overlayLabels: Record<OverlaySetting, string> = {
  aurora: "Aurora",
  wind: "Wind speed",
  temp: "Temperature",
  rh: "Relative humidity",
  mslp: "Mean sea level pressure",
  tpw: "Total precipitable water",
  misery: "Misery index",
  waves: "Significant wave height",
};

const projectionLabels: Record<ProjectionSetting, string> = {
  orthographic: "Orthographic",
  equirectangular: "Equirectangular",
  "azimuthal-eq": "Azimuthal equal-area",
  polar: "Polar",
  satellite: "Geostationary",
};

const fieldLabels: Record<FieldSetting, string> = {
  waves: "Ocean waves",
  wind: "Wind",
  temp: "Air temperature",
  rh: "Relative humidity",
  mslp: "Sea level pressure",
  tpw: "Total precipitable water",
  misery: "Misery index",
  mag: "Magnetic field",
  no2: "Nitrogen dioxide",
  o3: "Ozone",
};

const presets: Preset[] = [
  {
    label: "Auroral activity",
    value: {
      domain: "space",
      surface: "primary",
      field: "waves",
      overlay: "aurora",
      projection: "orthographic",
    },
  },
  {
    label: "Ocean surface & waves",
    value: {
      domain: "earth",
      surface: "surface",
      field: "waves",
      overlay: "waves",
      projection: "orthographic",
    },
  },
  {
    label: "Storm monitoring",
    value: {
      domain: "earth",
      surface: "surface",
      field: "mslp",
      overlay: "wind",
      projection: "equirectangular",
    },
  },
];

const DEFAULT_LATITUDE = 40.793;
const DEFAULT_LONGITUDE = -77.863;

export function EarthNullschoolGlobe({ latitude, longitude, locationName }: EarthNullschoolGlobeProps) {
  const hasCoordinates = isValidCoordinate(latitude) && isValidCoordinate(longitude);

  // Controls
  const [locale, setLocale] = useState<LocaleSetting>("en");
  const [animation, setAnimation] = useState<AnimationSetting>("off");
  const [domain, setDomain] = useState<DomainSetting>("space");
  const [surface, setSurface] = useState<SurfaceSetting>("primary");
  const [field, setField] = useState<FieldSetting>("waves");
  const [overlay, setOverlay] = useState<OverlaySetting>("aurora");
  const [projection, setProjection] = useState<ProjectionSetting>("orthographic");
  const [dateMode, setDateMode] = useState<"current" | "archived">("current");
  const [customDate, setCustomDate] = useState("2023-09-12");
  const [customTime, setCustomTime] = useState("18:00");
  const [latitudeInput, setLatitudeInput] = useState<string>(
    hasCoordinates ? latitude!.toFixed(3) : DEFAULT_LATITUDE.toFixed(3)
  );
  const [longitudeInput, setLongitudeInput] = useState<string>(
    hasCoordinates ? longitude!.toFixed(3) : DEFAULT_LONGITUDE.toFixed(3)
  );

  useEffect(() => {
    if (isValidCoordinate(latitude)) setLatitudeInput(latitude.toFixed(3));
  }, [latitude]);

  useEffect(() => {
    if (isValidCoordinate(longitude)) setLongitudeInput(longitude.toFixed(3));
  }, [longitude]);

  const parsedLatitude = useMemo(() => {
    const value = parseFloat(latitudeInput);
    return Number.isFinite(value) ? value : DEFAULT_LATITUDE;
  }, [latitudeInput]);

  const parsedLongitude = useMemo(() => {
    const value = parseFloat(longitudeInput);
    return Number.isFinite(value) ? value : DEFAULT_LONGITUDE;
  }, [longitudeInput]);

  const timestampSegment = useMemo(() => {
    if (dateMode === "current") return "current";
    const [year, month, day] = customDate.split("-");
    if (!year || !month || !day) return "current";
    const time = (customTime || "00:00").replace(":", "");
    return `${year}/${month}/${day}/${time}Z`;
  }, [dateMode, customDate, customTime]);

  const baseUrl = useMemo(() => {
    return locale === "en" ? "https://earth.nullschool.net" : `https://earth.nullschool.net/${locale}`;
  }, [locale]);

  const mapSrc = useMemo(() => {
    const lon = parsedLongitude.toFixed(3);
    const lat = parsedLatitude.toFixed(3);
    return `${baseUrl}/#${timestampSegment}/${domain}/${surface}/${field}/anim=${animation}/overlay=${overlay}/${projection}/loc=${lon},${lat}`;
  }, [
    baseUrl,
    timestampSegment,
    domain,
    surface,
    field,
    animation,
    overlay,
    projection,
    parsedLongitude,
    parsedLatitude,
  ]);

  const handleApplyPreset = (preset: Preset) => {
    setDomain(preset.value.domain);
    setSurface(preset.value.surface);
    setField(preset.value.field);
    setOverlay(preset.value.overlay);
    setProjection(preset.value.projection);
  };

  const handleReset = () => {
    setLocale("en");
    setAnimation("off");
    setDomain("space");
    setSurface("primary");
    setField("waves");
    setOverlay("aurora");
    setProjection("orthographic");
    setDateMode("current");
    setCustomDate("2023-09-12");
    setCustomTime("18:00");
    setLatitudeInput(hasCoordinates ? latitude!.toFixed(3) : DEFAULT_LATITUDE.toFixed(3));
    setLongitudeInput(hasCoordinates ? longitude!.toFixed(3) : DEFAULT_LONGITUDE.toFixed(3));
  };

  const coordinateBadge = `${formatCoordinate(parsedLatitude, "lat")} · ${formatCoordinate(
    parsedLongitude,
    "lon"
  )}`;

  return (
    <Card className="border-blue-200 bg-white/70">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-blue-900 text-lg font-semibold">
              <Globe2 className="h-5 w-5" />
              Live Environmental Globe
            </CardTitle>
            <CardDescription className="text-sm text-blue-800">
              Interactive auroral, wind, and ocean overlays from earth.nullschool.net—centered on your site.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Reset view
            </Button>
            <Button asChild size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <a href={mapSrc} target="_blank" rel="noreferrer">
                <Share2 className="h-4 w-4" />
                Open in new tab
              </a>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-blue-900">
          {locationName && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {locationName}
            </span>
          )}
          <Badge variant="outline" className="border-blue-200 bg-blue-50/60 uppercase tracking-wide">
            {coordinateBadge}
          </Badge>
        </div>

        {!hasCoordinates && (
          <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            Tip: Save project latitude/longitude to auto-center the globe on your worksite. Using defaults for now.
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Controls */}
          <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/70 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Settings className="h-4 w-4" />
              Map controls
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="nullschool-lat">Latitude</Label>
                  <Input
                    id="nullschool-lat"
                    value={latitudeInput}
                    inputMode="decimal"
                    onChange={(e) => setLatitudeInput(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nullschool-lon">Longitude</Label>
                  <Input
                    id="nullschool-lon"
                    value={longitudeInput}
                    inputMode="decimal"
                    onChange={(e) => setLongitudeInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Locale</Label>
                <Select value={locale} onValueChange={(v) => setLocale(v as LocaleSetting)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Domain</Label>
                  <Select value={domain} onValueChange={(v) => setDomain(v as DomainSetting)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="space">Space</SelectItem>
                      <SelectItem value="earth">Earth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Surface</Label>
                  <Select value={surface} onValueChange={(v) => setSurface(v as SurfaceSetting)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="surface">Surface</SelectItem>
                      <SelectItem value="overlay">Overlay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Field</Label>
                  <Select value={field} onValueChange={(v) => setField(v as FieldSetting)}>
                    <SelectTrigger><SelectValue placeholder="Choose field" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(fieldLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Overlay</Label>
                  <Select value={overlay} onValueChange={(v) => setOverlay(v as OverlaySetting)}>
                    <SelectTrigger><SelectValue placeholder="Choose overlay" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(overlayLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Projection</Label>
                  <Select value={projection} onValueChange={(v) => setProjection(v as ProjectionSetting)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(projectionLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Animation</Label>
                  <Select value={animation} onValueChange={(v) => setAnimation(v as AnimationSetting)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="on">On</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date mode</Label>
                  <Select value={dateMode} onValueChange={(v) => setDateMode(v as "current" | "archived")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  {dateMode === "archived" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="nullschool-date">Date</Label>
                        <Input
                          id="nullschool-date"
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="nullschool-time">Time (UTC)</Label>
                        <Input
                          id="nullschool-time"
                          type="time"
                          step={900}
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-blue-800">View is locked to live data.</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Operational presets</Label>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "gap-2 border-blue-200 text-blue-800 hover:bg-blue-100",
                        domain === preset.value.domain &&
                          surface === preset.value.surface &&
                          field === preset.value.field &&
                          overlay === preset.value.overlay &&
                          projection === preset.value.projection &&
                          "bg-blue-200/80"
                      )}
                      onClick={() => handleApplyPreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="overflow-hidden rounded-xl border border-blue-200 bg-slate-900 shadow-inner">
            <div className="relative pb-[66%]">
              <iframe
                title="HydroSafe environmental globe"
                src={mapSrc}
                loading="lazy"
                className="absolute inset-0 h-full w-full border-0"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EarthNullschoolGlobe;
