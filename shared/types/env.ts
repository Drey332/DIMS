export type RiskLevel = "low" | "medium" | "high";

export interface EnvIndicators {
  kp_index: number | null;
  quakes_24h_count: number;
  strongest_quake_mag: number | null;
}

export interface EnvContext {
  lat: number;
  lon: number;
  fetched_at: string;
  indicators: EnvIndicators;
  risk_level: RiskLevel;
  key_risks: string[];
  protective_measures: string[];
  erp_note_md: string;
  /**
   * When true the upstream feeds were unavailable and the payload represents the last
   * known or fallback intelligence. Clients should surface the note as stale data.
   */
  stale?: boolean;
  /**
   * Optional list of rule identifiers that escalated the current risk level. This lets
   * UI surfaces explain why a posture was chosen and is useful for auditing.
   */
  rule_hits?: string[];
}
