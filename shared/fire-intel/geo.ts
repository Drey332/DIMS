export function toSeason(dateIso: string, lat: number): "winter" | "spring" | "summer" | "fall" {
  const m = new Date(dateIso).getUTCMonth() + 1;
  const north = lat >= 0;
  
  const seasonMapNorth: Record<number, "winter" | "spring" | "summer" | "fall"> = {
    1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring",
    6: "summer", 7: "summer", 8: "summer", 9: "fall", 10: "fall",
    11: "fall", 12: "winter"
  };
  
  const seasonMapSouth: Record<number, "winter" | "spring" | "summer" | "fall"> = {
    1: "summer", 2: "summer", 3: "fall", 4: "fall", 5: "fall",
    6: "winter", 7: "winter", 8: "winter", 9: "spring", 10: "spring",
    11: "spring", 12: "summer"
  };
  
  return north ? seasonMapNorth[m] : seasonMapSouth[m];
}

export function latBand(lat: number): "tropical" | "subtropical" | "midlat" | "polar" {
  const a = Math.abs(lat);
  if (a < 23.5) return "tropical";
  if (a < 45) return "subtropical";
  if (a < 66.5) return "midlat";
  return "polar";
}

export function basin(lat: number, lon: number): string {
  if (lat > 0 && lon > -100 && lon < 20) return "North_Atlantic";
  if (lat > 0 && lon >= 20 && lon < 180) return "North_Indian_Pacific";
  if (lat < 0 && lon > -80 && lon < 40) return "South_Atlantic_Indian";
  return "Pacific_Other";
}
