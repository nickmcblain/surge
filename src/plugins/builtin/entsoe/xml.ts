import { XMLParser } from "fast-xml-parser";
import type { EnergyPoint, EnergyResolution } from "../../../types/energy";
import { RESOLUTION_MS, isEnergyResolution } from "./time";

/**
 * One ENTSO-E `TimeSeries`, flattened. Both Publication (prices, flows) and GL
 * (load, generation) documents reduce to this shape; the caller decides which
 * domain field identifies the zone.
 */
export interface EntsoeTimeSeries {
  businessType: string | null;
  inDomain: string | null;
  outDomain: string | null;
  inBiddingZone: string | null;
  outBiddingZone: string | null;
  psrType: string | null;
  currency: string | null;
  unit: string | null;
  resolution: EnergyResolution;
  points: EnergyPoint[];
}

export class EntsoeApiError extends Error {
  constructor(message: string, readonly code: string | null = null) {
    super(message);
    this.name = "EntsoeApiError";
  }
}

const ARRAY_TAGS = new Set(["TimeSeries", "Period", "Point", "Reason"]);

const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => ARRAY_TAGS.has(name),
});

type Node = Record<string, unknown>;

function text(node: Node | undefined, key: string): string | null {
  const value = node?.[key];
  if (value == null) return null;
  if (typeof value === "object") {
    const inner = (value as Node)["#text"];
    return inner == null ? null : String(inner);
  }
  return String(value);
}

function number(node: Node | undefined, key: string): number | null {
  const raw = text(node, key);
  if (raw == null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function expandPeriod(period: Node, fillForward: boolean): { resolution: EnergyResolution; points: EnergyPoint[] } | null {
  const resolutionRaw = text(period, "resolution") ?? "";
  if (!isEnergyResolution(resolutionRaw)) return null;
  const interval = period.timeInterval as Node | undefined;
  const start = Date.parse(text(interval, "start") ?? "");
  const end = Date.parse(text(interval, "end") ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const step = RESOLUTION_MS[resolutionRaw];
  const slots = Math.round((end - start) / step);
  const values = new Array<number | null>(slots).fill(null);
  const rawPoints = (period.Point as Node[] | undefined) ?? [];
  for (const point of rawPoints) {
    const position = number(point, "position");
    if (position == null || position < 1 || position > slots) continue;
    values[position - 1] = number(point, "price.amount") ?? number(point, "quantity");
  }
  // curveType A03 omits a position when its value repeats the previous one.
  if (fillForward) {
    for (let index = 1; index < slots; index += 1) {
      if (values[index] == null) values[index] = values[index - 1] ?? null;
    }
  }
  return {
    resolution: resolutionRaw,
    points: values.map((value, index) => ({ ts: start + index * step, value })),
  };
}

/**
 * Parses any ENTSO-E market document into time series. Throws `EntsoeApiError`
 * for `Acknowledgement_MarketDocument` replies other than "no data", which
 * resolves to an empty array so callers can render an honest empty state.
 */
export function parseEntsoeDocument(xml: string): EntsoeTimeSeries[] {
  const root = parser.parse(xml) as Node;
  const ack = root.Acknowledgement_MarketDocument as Node | undefined;
  if (ack) {
    const reason = ((ack.Reason as Node[] | undefined) ?? [])[0];
    const code = text(reason, "code");
    const message = text(reason, "text") ?? "ENTSO-E rejected the request.";
    if (code === "999" && /no matching data/i.test(message)) return [];
    throw new EntsoeApiError(message, code);
  }
  const document = (root.Publication_MarketDocument ?? root.GL_MarketDocument) as Node | undefined;
  if (!document) {
    const html = /<html/i.test(xml);
    throw new EntsoeApiError(html ? "ENTSO-E returned an HTML page instead of data; check the security token." : "Unrecognised ENTSO-E document.");
  }
  const series: EntsoeTimeSeries[] = [];
  for (const entry of (document.TimeSeries as Node[] | undefined) ?? []) {
    const psr = entry.MktPSRType as Node | undefined;
    const base = {
      businessType: text(entry, "businessType"),
      inDomain: text(entry, "in_Domain.mRID"),
      outDomain: text(entry, "out_Domain.mRID"),
      inBiddingZone: text(entry, "inBiddingZone_Domain.mRID"),
      outBiddingZone: text(entry, "outBiddingZone_Domain.mRID"),
      psrType: text(psr, "psrType"),
      currency: text(entry, "currency_Unit.name"),
      unit: text(entry, "price_Measure_Unit.name") ?? text(entry, "quantity_Measure_Unit.name"),
    };
    // Periods of the same resolution within one TimeSeries are one continuous series.
    const fillForward = text(entry, "curveType") === "A03";
    const byResolution = new Map<EnergyResolution, EnergyPoint[]>();
    for (const period of (entry.Period as Node[] | undefined) ?? []) {
      const expanded = expandPeriod(period, fillForward);
      if (!expanded) continue;
      const bucket = byResolution.get(expanded.resolution) ?? [];
      bucket.push(...expanded.points);
      byResolution.set(expanded.resolution, bucket);
    }
    for (const [resolution, points] of byResolution) {
      points.sort((a, b) => a.ts - b.ts);
      series.push({ ...base, resolution, points });
    }
  }
  return series;
}

/**
 * Merges series that describe the same thing (same domain/psr) at the same
 * resolution, then picks one resolution: `prefer` if present, otherwise the
 * finest available. Returns null when nothing matched.
 */
export function mergeSeries(
  entries: readonly EntsoeTimeSeries[],
  prefer: EnergyResolution = "PT60M",
): { resolution: EnergyResolution; points: EnergyPoint[] } | null {
  if (entries.length === 0) return null;
  const byResolution = new Map<EnergyResolution, Map<number, number | null>>();
  for (const entry of entries) {
    const bucket = byResolution.get(entry.resolution) ?? new Map<number, number | null>();
    for (const point of entry.points) {
      if (point.value != null || !bucket.has(point.ts)) bucket.set(point.ts, point.value);
    }
    byResolution.set(entry.resolution, bucket);
  }
  const resolution = byResolution.has(prefer)
    ? prefer
    : ([...byResolution.keys()].sort((a, b) => RESOLUTION_MS[a] - RESOLUTION_MS[b])[0] as EnergyResolution);
  const points = [...byResolution.get(resolution)!.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, value]) => ({ ts, value }));
  return { resolution, points };
}
