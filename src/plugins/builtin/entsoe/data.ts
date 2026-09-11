import { createPluginCache, type PluginCacheResult } from "../../../data/plugin-cache";
import type {
  EnergySeriesBundle,
  FlowSeries,
  GenerationMix,
  LoadKind,
  LoadSeries,
  ZonePriceSeries,
} from "../../../types/energy";
import type { PluginPersistence } from "../../../types/plugin";
import { createEntsoeClient, type EntsoeClient } from "./client";
import { localDayWindow, type DayWindow } from "./time";
import { getEntsoeToken } from "./token";
import type { BiddingZone } from "./zones";

const CACHE_SOURCE = "entsoe";
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/**
 * Day-ahead results are final once published, but the next day's slot is
 * empty until ~12:45 CET, so a half-hour window keeps "tomorrow" appearing
 * without hammering the API for history that cannot change.
 */
const pricesCache = createPluginCache<ZonePriceSeries>({
  kind: "entsoe-day-ahead", source: CACHE_SOURCE, policy: { staleMs: 30 * MINUTE, expireMs: 90 * DAY },
});
const loadCache = createPluginCache<LoadSeries>({
  kind: "entsoe-load", source: CACHE_SOURCE, policy: { staleMs: 15 * MINUTE, expireMs: 30 * DAY },
});
const generationCache = createPluginCache<GenerationMix>({
  kind: "entsoe-generation", source: CACHE_SOURCE, policy: { staleMs: 15 * MINUTE, expireMs: 30 * DAY },
});
const resForecastCache = createPluginCache<GenerationMix>({
  kind: "entsoe-res-forecast", source: CACHE_SOURCE, policy: { staleMs: 60 * MINUTE, expireMs: 30 * DAY },
});
const flowCache = createPluginCache<FlowSeries>({
  kind: "entsoe-flow", source: CACHE_SOURCE, policy: { staleMs: 15 * MINUTE, expireMs: 30 * DAY },
});

const caches = [pricesCache, loadCache, generationCache, resForecastCache, flowCache];

export function attachEntsoePersistence(persistence: PluginPersistence): void {
  for (const cache of caches) cache.attach(persistence);
}

export function resetEntsoePersistence(): void {
  for (const cache of caches) cache.reset();
}

let client: EntsoeClient = createEntsoeClient({ getToken: getEntsoeToken });

/** Tests swap the client; production uses the token-backed default. */
export function setEntsoeClient(next: EntsoeClient | null): void {
  client = next ?? createEntsoeClient({ getToken: getEntsoeToken });
}

function toBundle<T>(result: PluginCacheResult<T>): EnergySeriesBundle<T> {
  return {
    data: result.data,
    fetchedAt: result.fetchedAt,
    stale: result.stale,
    source: result.source,
    ...(result.refreshError ? { refreshError: result.refreshError } : {}),
  };
}

function fromCache<T>(result: PluginCacheResult<T> | null): EnergySeriesBundle<T> | null {
  return result ? toBundle(result) : null;
}

/** Local trading day for the zone, `offsetDays` from now: 0 today, 1 tomorrow, -1 yesterday. */
export function zoneDay(zone: BiddingZone, offsetDays = 0, now = Date.now()): DayWindow {
  return localDayWindow(now, zone.timeZone, offsetDays);
}

export function getCachedDayAhead(zone: BiddingZone, day: DayWindow): EnergySeriesBundle<ZonePriceSeries> | null {
  return fromCache(pricesCache.get(`${zone.code}:${day.dateKey}`, { allowExpired: true }));
}

export async function loadDayAhead(zone: BiddingZone, day: DayWindow, options?: { force?: boolean }): Promise<EnergySeriesBundle<ZonePriceSeries>> {
  return toBundle(await pricesCache.load(`${zone.code}:${day.dateKey}`, () => client.dayAheadPrices(zone, day), options));
}

export function getCachedLoad(zone: BiddingZone, day: DayWindow, kind: LoadKind): EnergySeriesBundle<LoadSeries> | null {
  return fromCache(loadCache.get(`${zone.code}:${kind}:${day.dateKey}`, { allowExpired: true }));
}

export async function loadLoad(zone: BiddingZone, day: DayWindow, kind: LoadKind, options?: { force?: boolean }): Promise<EnergySeriesBundle<LoadSeries>> {
  return toBundle(await loadCache.load(`${zone.code}:${kind}:${day.dateKey}`, () => client.load(zone, day, kind), options));
}

export function getCachedGeneration(zone: BiddingZone, day: DayWindow): EnergySeriesBundle<GenerationMix> | null {
  return fromCache(generationCache.get(`${zone.code}:${day.dateKey}`, { allowExpired: true }));
}

export async function loadGeneration(zone: BiddingZone, day: DayWindow, options?: { force?: boolean }): Promise<EnergySeriesBundle<GenerationMix>> {
  return toBundle(await generationCache.load(`${zone.code}:${day.dateKey}`, () => client.generationPerType(zone, day), options));
}

export function getCachedResForecast(zone: BiddingZone, day: DayWindow): EnergySeriesBundle<GenerationMix> | null {
  return fromCache(resForecastCache.get(`${zone.code}:${day.dateKey}`, { allowExpired: true }));
}

export async function loadResForecast(zone: BiddingZone, day: DayWindow, options?: { force?: boolean }): Promise<EnergySeriesBundle<GenerationMix>> {
  return toBundle(await resForecastCache.load(`${zone.code}:${day.dateKey}`, () => client.windSolarForecast(zone, day), options));
}

export function getCachedFlow(from: BiddingZone, to: BiddingZone, day: DayWindow): EnergySeriesBundle<FlowSeries> | null {
  return fromCache(flowCache.get(`${from.code}>${to.code}:${day.dateKey}`, { allowExpired: true }));
}

export async function loadFlow(from: BiddingZone, to: BiddingZone, day: DayWindow, options?: { force?: boolean }): Promise<EnergySeriesBundle<FlowSeries>> {
  return toBundle(await flowCache.load(`${from.code}>${to.code}:${day.dateKey}`, () => client.physicalFlow(from, to, day), options));
}
