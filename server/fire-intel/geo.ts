export type Season = "winter" | "spring" | "summer" | "fall";

export function toSeason(dateIso: string, latitude: number): Season {
  const date = new Date(dateIso);
  const month = Number.isNaN(date.getTime()) ? new Date().getUTCMonth() + 1 : date.getUTCMonth() + 1;
  const north = latitude >= 0;
  const seasonMapNorth: Record<number, Season> = {
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
  const seasonMapSouth: Record<number, Season> = {
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
  const lookup = north ? seasonMapNorth : seasonMapSouth;
  return lookup[month] ?? "summer";
}

export function latBand(latitude: number): "tropical" | "subtropical" | "midlat" | "polar" {
  const absLat = Math.abs(latitude);
  if (absLat < 23.5) return "tropical";
  if (absLat < 45) return "subtropical";
  if (absLat < 66.5) return "midlat";
  return "polar";
}

export function basin(latitude: number, longitude: number):
  | "North_Atlantic"
  | "North_Indian_Pacific"
  | "South_Atlantic_Indian"
  | "Pacific_Other" {
  if (latitude > 0 && longitude > -100 && longitude < 20) return "North_Atlantic";
  if (latitude > 0 && longitude >= 20 && longitude < 180) return "North_Indian_Pacific";
  if (latitude < 0 && longitude > -80 && longitude < 40) return "South_Atlantic_Indian";
  return "Pacific_Other";
}
