export type FuturesSector =
  | "energy"
  | "gas"
  | "metals"
  | "currencies"
  | "rates";

export interface FuturesContract {
  /** Yahoo continuous front-month symbol. */
  symbol: string;
  /** Exchange code traders quote, e.g. ES. */
  code: string;
  name: string;
  sector: FuturesSector;
  /**
   * Minimum price increment of the outright contract. It is the display
   * precision: silver ticks at $0.005, so rendering it with two decimals
   * collapses every tick. Rates contracts leave this unset because their
   * 32nd-based ticks (down to 1/256) do not map to a readable decimal count.
   */
  tick?: number;
}

/** 0.005 -> 3, 0.25 -> 2, 1 -> 0. Written for ticks, not general numbers. */
export function tickDecimals(tick: number): number {
  return tick.toFixed(10).replace(/0+$/, "").split(".")[1]?.length ?? 0;
}

/**
 * Front-month continuous contracts an energy desk watches, every one confirmed
 * to resolve through the Yahoo provider. European power has no free continuous
 * quote, so it lives in the ENTSO-E panes instead of this board.
 */
export const FUTURES_CONTRACTS: FuturesContract[] = [
  { symbol: "BZ=F", code: "BZ", name: "Brent Crude Oil", sector: "energy", tick: 0.01 },
  { symbol: "CL=F", code: "CL", name: "WTI Crude Oil", sector: "energy", tick: 0.01 },
  { symbol: "HO=F", code: "HO", name: "Heating Oil", sector: "energy", tick: 0.0001 },
  { symbol: "RB=F", code: "RB", name: "RBOB Gasoline", sector: "energy", tick: 0.0001 },

  { symbol: "TTF=F", code: "TTF", name: "Dutch TTF Natural Gas", sector: "gas", tick: 0.005 },
  { symbol: "NG=F", code: "NG", name: "Henry Hub Natural Gas", sector: "gas", tick: 0.001 },

  { symbol: "HG=F", code: "HG", name: "Copper", sector: "metals", tick: 0.0005 },
  { symbol: "PL=F", code: "PL", name: "Platinum", sector: "metals", tick: 0.1 },
  { symbol: "PA=F", code: "PA", name: "Palladium", sector: "metals", tick: 0.1 },
  { symbol: "SI=F", code: "SI", name: "Silver", sector: "metals", tick: 0.005 },
  { symbol: "GC=F", code: "GC", name: "Gold", sector: "metals", tick: 0.1 },

  { symbol: "6E=F", code: "6E", name: "Euro FX", sector: "currencies", tick: 0.00005 },
  { symbol: "6B=F", code: "6B", name: "British Pound", sector: "currencies", tick: 0.0001 },
  { symbol: "6S=F", code: "6S", name: "Swiss Franc", sector: "currencies", tick: 0.00005 },
  { symbol: "6J=F", code: "6J", name: "Japanese Yen", sector: "currencies", tick: 0.0000005 },

  { symbol: "ZN=F", code: "ZN", name: "10-Year T-Note", sector: "rates" },
  { symbol: "ZB=F", code: "ZB", name: "30-Year T-Bond", sector: "rates" },
];

export const FUTURES_SECTOR_LABELS: Record<FuturesSector, string> = {
  energy: "Oil & Products",
  gas: "Natural Gas",
  metals: "Metals",
  currencies: "Currencies",
  rates: "Rates",
};

export const FUTURES_SECTOR_ORDER: FuturesSector[] = [
  "energy",
  "gas",
  "metals",
  "currencies",
  "rates",
];

export function getContractsBySector(): Map<FuturesSector, FuturesContract[]> {
  const map = new Map<FuturesSector, FuturesContract[]>();
  for (const sector of FUTURES_SECTOR_ORDER) {
    map.set(sector, FUTURES_CONTRACTS.filter((contract) => contract.sector === sector));
  }
  return map;
}
