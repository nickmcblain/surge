/**
 * Normalised energy-market series shared by the ENTSO-E provider and the energy
 * panes. Points carry epoch milliseconds so they serialise straight into the
 * plugin cache; convert to Date at the chart boundary.
 */

export type EnergyResolution = "PT15M" | "PT30M" | "PT60M";

export interface EnergyPoint {
  /** Interval start, epoch ms UTC. */
  ts: number;
  value: number | null;
}

export interface EnergySeries {
  /** Bidding-zone code as used in the zones table, e.g. "DE-LU". */
  zone: string;
  unit: string;
  resolution: EnergyResolution;
  points: EnergyPoint[];
}

export interface ZonePriceSeries extends EnergySeries {
  currency: string;
}

export type LoadKind = "actual" | "forecast";

export interface LoadSeries extends EnergySeries {
  kind: LoadKind;
}

/** ENTSO-E production-source (PSR) type codes. */
export type PsrType =
  | "B01" | "B02" | "B03" | "B04" | "B05" | "B06" | "B07" | "B08" | "B09" | "B10"
  | "B11" | "B12" | "B13" | "B14" | "B15" | "B16" | "B17" | "B18" | "B19" | "B20" | "B25";

export interface GenerationMix {
  zone: string;
  unit: string;
  resolution: EnergyResolution;
  /** Generation per PSR type; consumption legs (pumping) are excluded. */
  byType: Partial<Record<PsrType, EnergyPoint[]>>;
}

export interface FlowSeries extends EnergySeries {
  /** Exporting zone. */
  from: string;
  /** Importing zone. */
  to: string;
}

export interface EnergySeriesBundle<T> {
  data: T;
  fetchedAt: number;
  stale: boolean;
  source: "cache" | "network" | "stale-fallback";
  refreshError?: string;
}
