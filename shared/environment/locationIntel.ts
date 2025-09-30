export type LocationRiskLevel = "low" | "moderate" | "elevated" | "high" | "critical";

export type CoordinateSource = "catalog" | "parsed" | "fallback";

export type IntelligenceConfidence = "high" | "medium" | "low";

export interface LocationIntel {
  slug: string;
  displayName: string;
  latitude: number;
  longitude: number;
  region: string;
  operationType?: string;
  bodyOfWater?: string;
  riskLevel: LocationRiskLevel;
  riskSummary: string;
  riskFactors: string[];
  protectiveMeasures: string[];
  supportingNotes?: string[];
  aliases?: string[];
  coordinateSource: CoordinateSource;
  confidence: IntelligenceConfidence;
  originalQuery?: string;
}

export const DEFAULT_OPERATION_COORDINATES = {
  latitude: 40.793,
  longitude: -77.863,
};

const locationCatalog: LocationIntel[] = [
  {
    slug: "forcados-nigeria",
    displayName: "Forcados Terminal, Niger Delta, Nigeria",
    aliases: [
      "forcados",
      "forcados, nigeria",
      "forcados terminal",
      "forcados offshore",
      "forcados export terminal",
    ],
    latitude: 4.437,
    longitude: 5.760,
    region: "Niger Delta Shallow Offshore",
    bodyOfWater: "Bight of Benin",
    operationType: "Shallow offshore decommissioning",
    riskLevel: "high",
    riskSummary:
      "Militancy, piracy, and constrained medevac corridors require Gold Command oversight of every emergency deployment.",
    riskFactors: [
      "Militant activity and piracy across Niger Delta waterways",
      "Remote location with limited daylight helicopter medevac windows",
      "High thunderstorm frequency driving rapid sea state changes",
      "Legacy infrastructure with unknown integrity during decommissioning",
    ],
    protectiveMeasures: [
      "Coordinate vessel movements with Joint Task Force and SPDC security escorts",
      "Stage secondary medevac craft at Escravos or Warri for night operations",
      "Maintain redundant communications (VSAT + HF) to counter outages",
      "Execute dynamic positioning assurance checks before subsea work windows",
    ],
    supportingNotes: [
      "Nearest decompression chamber: Warri (approx. 70 km NE)",
      "Primary medevac rally point: Osubi Airport, Warri",
      "Weather hold thresholds: Sustained winds > 25 knots or swell > 2.5 m",
    ],
    coordinateSource: "catalog",
    confidence: "high",
  },
  {
    slug: "bonny-island-nigeria",
    displayName: "Bonny Island & Offshore Fields, Nigeria",
    aliases: [
      "bonny",
      "bonny island",
      "nlng bonny",
      "bonny, nigeria",
      "bonny offshore",
    ],
    latitude: 4.451,
    longitude: 7.168,
    region: "Niger Delta Offshore",
    bodyOfWater: "Bonny River / Atlantic approaches",
    operationType: "Subsea inspections & gas export terminal support",
    riskLevel: "elevated",
    riskSummary:
      "Crowded LNG shipping lanes and shallow sandbanks create collision and grounding exposure during emergency transits.",
    riskFactors: [
      "Congested shipping traffic around NLNG jetties",
      "Seasonal Harmattan haze reducing visibility for aerial response",
      "Sandbanks and shifting channels complicating night medevac routes",
      "Community protest risk impacting logistics convoys",
    ],
    protectiveMeasures: [
      "Coordinate with NLNG marine control before mobilising response craft",
      "Maintain updated channel surveys and tide tables on the bridge",
      "Pre-authorise security escorts for shoreline evacuation corridors",
      "Equip medevac crews with IFR-capable navigation aids during Harmattan season",
    ],
    supportingNotes: [
      "Nearest tertiary hospital: Port Harcourt (helicopter ~35 min)",
      "Establish safe anchorage outside gas carrier turning basin during ERP deployments",
    ],
    coordinateSource: "catalog",
    confidence: "high",
  },
  {
    slug: "lagos-offshore-nigeria",
    displayName: "Lagos Offshore Support Corridor, Nigeria",
    aliases: [
      "lagos",
      "lagos, nigeria",
      "lagos offshore",
      "lagos support base",
      "takwa bay",
    ],
    latitude: 6.314,
    longitude: 3.202,
    region: "Gulf of Guinea Nearshore",
    bodyOfWater: "Atlantic Ocean",
    operationType: "Diving support & subsea construction staging",
    riskLevel: "moderate",
    riskSummary:
      "Weather volatility and congested approaches demand disciplined permit-to-work coordination for every emergency launch.",
    riskFactors: [
      "Sudden squalls and microbursts during wet season",
      "Heavy small craft traffic across Lagos harbour approaches",
      "Urban security risks during personnel transfers",
      "High electrical storm density impacting surface operations",
    ],
    protectiveMeasures: [
      "Synchronise ERP drills with NIMASA harbour masters for corridor deconfliction",
      "Hold lightning standbys at first detection within 10 km radius",
      "Use hardened convoy plans between Apapa base and air/sea terminals",
      "Maintain redundant power protection for mission-critical control rooms",
    ],
    supportingNotes: [
      "Primary medevac runway: Murtala Muhammed International Airport",
      "Nearest recompression capability: Nigerian Navy hospital, Victoria Island",
    ],
    coordinateSource: "catalog",
    confidence: "high",
  },
];

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseCoordinatesFromString(raw: string): { latitude: number; longitude: number } | undefined {
  const matches = raw.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) {
    return undefined;
  }

  const [first, second] = matches.map(Number.parseFloat);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return undefined;
  }

  // Attempt to detect if the string is formatted as lon,lat by checking for the word "loc" or "lon" before the first number.
  const lonFirst = /(lon|long|lng|loc)[^\d-]*-?\d/.test(raw.toLowerCase());
  const latitude = lonFirst ? second : first;
  const longitude = lonFirst ? first : second;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined;
  }

  return { latitude, longitude };
}

export function lookupLocationIntel(location?: string): LocationIntel | undefined {
  if (!location) {
    return undefined;
  }

  const normalisedQuery = normalise(location);
  if (!normalisedQuery) {
    return undefined;
  }

  for (const entry of locationCatalog) {
    const aliases = new Set([entry.displayName, ...(entry.aliases ?? [])]);
    for (const alias of Array.from(aliases)) {
      const normalisedAlias = normalise(alias);
      if (normalisedAlias === normalisedQuery || normalisedQuery.includes(normalisedAlias)) {
        return { ...entry, originalQuery: location };
      }
    }
  }

  const derivedCoordinates = parseCoordinatesFromString(location);
  if (derivedCoordinates) {
    return {
      slug: `coordinates-${derivedCoordinates.latitude.toFixed(3)}-${derivedCoordinates.longitude.toFixed(3)}`,
      displayName: `Operations near ${derivedCoordinates.latitude.toFixed(3)}°N, ${derivedCoordinates.longitude.toFixed(3)}°E`,
      latitude: derivedCoordinates.latitude,
      longitude: derivedCoordinates.longitude,
      region: "Derived coordinates",
      operationType: "Field-provided coordinates",
      riskLevel: "moderate",
      riskSummary:
        "Coordinates parsed from ERP request context. Validate with Gold Command before deploying emergency resources.",
      riskFactors: [
        "No catalogued HydroSafe intelligence for this exact location",
        "Potential for inaccurate or outdated coordinate references",
        "Unknown proximity to secure medevac or shelter assets",
      ],
      protectiveMeasures: [
        "Confirm coordinates with HydroSafe operations control room",
        "Task reconnaissance drone or support vessel to verify staging area",
        "Update ERP maps with confirmed grid references before drills",
      ],
      supportingNotes: [
        "Treat this location as provisional until validated during operational briefing",
      ],
      coordinateSource: "parsed",
      confidence: "medium",
      originalQuery: location,
    };
  }

  return {
    slug: "uncatalogued-location",
    displayName: location,
    latitude: DEFAULT_OPERATION_COORDINATES.latitude,
    longitude: DEFAULT_OPERATION_COORDINATES.longitude,
    region: "Uncatalogued operations area",
    riskLevel: "moderate",
    riskSummary:
      "Location not found in HydroSafe intelligence catalog. Treat as medium risk until a local threat briefing is completed.",
    riskFactors: [
      "Unknown security posture and community relations",
      "Unverified medevac and logistics corridors",
      "Limited environmental baselines for weather and metocean planning",
    ],
    protectiveMeasures: [
      "Engage HydroSafe intelligence cell for rapid threat assessment",
      "Conduct on-site hazard identification before high-risk work commences",
      "Update ERP documentation with verified coordinates and contacts",
    ],
    supportingNotes: [
      "Using training dataset coordinates until precise site is supplied",
    ],
    coordinateSource: "fallback",
    confidence: "low",
    originalQuery: location,
  };
}
