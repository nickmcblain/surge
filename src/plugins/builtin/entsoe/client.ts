import type {
  EnergyResolution,
  FlowSeries,
  GenerationMix,
  LoadKind,
  LoadSeries,
  PsrType,
  ZonePriceSeries,
} from "../../../types/energy";
import { httpFetch } from "../../../utils/http-transport";
import { formatEntsoePeriod } from "./time";
import { EntsoeApiError, mergeSeries, parseEntsoeDocument, type EntsoeTimeSeries } from "./xml";
import type { BiddingZone } from "./zones";

export const ENTSOE_API_URL = "https://web-api.tp.entsoe.eu/api";

export interface EntsoeWindow {
  startMs: number;
  endMs: number;
}

export interface EntsoeClientOptions {
  getToken(): string | null;
  fetch?: typeof httpFetch;
  baseUrl?: string;
  timeoutMs?: number;
}

export class EntsoeTokenMissingError extends Error {
  constructor() {
    super("ENTSO-E security token is not configured. Run the ENTSOE SETUP command.");
    this.name = "EntsoeTokenMissingError";
  }
}

export interface EntsoeClient {
  dayAheadPrices(zone: BiddingZone, window: EntsoeWindow, prefer?: EnergyResolution): Promise<ZonePriceSeries>;
  load(zone: BiddingZone, window: EntsoeWindow, kind: LoadKind): Promise<LoadSeries>;
  generationPerType(zone: BiddingZone, window: EntsoeWindow): Promise<GenerationMix>;
  windSolarForecast(zone: BiddingZone, window: EntsoeWindow): Promise<GenerationMix>;
  physicalFlow(from: BiddingZone, to: BiddingZone, window: EntsoeWindow): Promise<FlowSeries>;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export function createEntsoeClient(options: EntsoeClientOptions): EntsoeClient {
  const fetchImpl = options.fetch ?? httpFetch;
  const baseUrl = options.baseUrl ?? ENTSOE_API_URL;

  async function request(params: Record<string, string>, window: EntsoeWindow): Promise<EntsoeTimeSeries[]> {
    const token = options.getToken();
    if (!token) throw new EntsoeTokenMissingError();
    const url = new URL(baseUrl);
    url.searchParams.set("securityToken", token);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set("periodStart", formatEntsoePeriod(window.startMs));
    url.searchParams.set("periodEnd", formatEntsoePeriod(window.endMs));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetchImpl(url.toString(), { signal: controller.signal, headers: { accept: "application/xml" } });
    } finally {
      clearTimeout(timer);
    }
    const body = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new EntsoeApiError("ENTSO-E rejected the security token.", String(response.status));
    }
    if (response.status === 429) {
      throw new EntsoeApiError("ENTSO-E rate limit reached; try again in a minute.", "429");
    }
    if (!response.ok && !body.includes("Acknowledgement_MarketDocument")) {
      throw new EntsoeApiError(`ENTSO-E request failed (${response.status}).`, String(response.status));
    }
    return parseEntsoeDocument(body);
  }

  return {
    async dayAheadPrices(zone, window, prefer = "PT60M") {
      const series = await request({
        documentType: "A44",
        in_Domain: zone.eic,
        out_Domain: zone.eic,
      }, window);
      const merged = mergeSeries(series, prefer);
      return {
        zone: zone.code,
        currency: series[0]?.currency ?? zone.currency,
        unit: `${series[0]?.currency ?? zone.currency}/MWh`,
        resolution: merged?.resolution ?? prefer,
        points: merged?.points ?? [],
      };
    },

    async load(zone, window, kind) {
      const series = await request({
        documentType: "A65",
        processType: kind === "actual" ? "A16" : "A01",
        outBiddingZone_Domain: zone.eic,
      }, window);
      const merged = mergeSeries(series);
      return { zone: zone.code, kind, unit: "MW", resolution: merged?.resolution ?? "PT60M", points: merged?.points ?? [] };
    },

    async generationPerType(zone, window) {
      const series = await request({
        documentType: "A75",
        processType: "A16",
        in_Domain: zone.eic,
      }, window);
      return toGenerationMix(zone, series.filter((entry) => entry.inBiddingZone != null || entry.outBiddingZone == null));
    },

    async windSolarForecast(zone, window) {
      const series = await request({
        documentType: "A69",
        processType: "A01",
        in_Domain: zone.eic,
      }, window);
      return toGenerationMix(zone, series);
    },

    async physicalFlow(from, to, window) {
      const series = await request({
        documentType: "A11",
        in_Domain: to.eic,
        out_Domain: from.eic,
      }, window);
      const merged = mergeSeries(series);
      return {
        zone: from.code,
        from: from.code,
        to: to.code,
        unit: "MW",
        resolution: merged?.resolution ?? "PT60M",
        points: merged?.points ?? [],
      };
    },
  };
}

function toGenerationMix(zone: BiddingZone, series: readonly EntsoeTimeSeries[]): GenerationMix {
  const grouped = new Map<PsrType, EntsoeTimeSeries[]>();
  for (const entry of series) {
    const psr = entry.psrType as PsrType | null;
    if (!psr) continue;
    const bucket = grouped.get(psr) ?? [];
    bucket.push(entry);
    grouped.set(psr, bucket);
  }
  const byType: GenerationMix["byType"] = {};
  let resolution: EnergyResolution = "PT60M";
  for (const [psr, entries] of grouped) {
    const merged = mergeSeries(entries);
    if (!merged) continue;
    byType[psr] = merged.points;
    resolution = merged.resolution;
  }
  return { zone: zone.code, unit: "MW", resolution, byType };
}
