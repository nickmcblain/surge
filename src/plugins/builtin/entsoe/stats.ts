import type { EnergyPoint } from "../../../types/energy";
import { localDateKey } from "./time";

export interface PriceStats {
  /** Simple average over every published interval. */
  baseload: number | null;
  /** Average over 08:00-20:00 local. */
  peak: number | null;
  /** Average outside 08:00-20:00 local. */
  offPeak: number | null;
  min: EnergyPoint | null;
  max: EnergyPoint | null;
  /** Published interval count; 0 means the day is not out yet. */
  count: number;
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function localHour(ms: number, timeZone: string): number {
  const label = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  return Number(label);
}

export function priceStats(points: readonly EnergyPoint[], timeZone: string): PriceStats {
  const published = points.filter((point): point is EnergyPoint & { value: number } => point.value != null);
  let min: EnergyPoint | null = null;
  let max: EnergyPoint | null = null;
  const peak: number[] = [];
  const offPeak: number[] = [];
  for (const point of published) {
    if (!min || point.value < min.value!) min = point;
    if (!max || point.value > max.value!) max = point;
    const hour = localHour(point.ts, timeZone);
    (hour >= 8 && hour < 20 ? peak : offPeak).push(point.value);
  }
  return {
    baseload: average(published.map((point) => point.value)),
    peak: average(peak),
    offPeak: average(offPeak),
    min,
    max,
    count: published.length,
  };
}

/** Last interval whose start is at or before `now`; null before the day starts. */
export function currentPoint(points: readonly EnergyPoint[], now = Date.now()): EnergyPoint | null {
  let current: EnergyPoint | null = null;
  for (const point of points) {
    if (point.ts > now) break;
    current = point;
  }
  return current;
}

export function sumPoints(series: readonly (readonly EnergyPoint[])[]): EnergyPoint[] {
  const totals = new Map<number, number | null>();
  for (const points of series) {
    for (const point of points) {
      const existing = totals.get(point.ts);
      if (point.value == null) {
        if (!totals.has(point.ts)) totals.set(point.ts, null);
        continue;
      }
      totals.set(point.ts, (existing ?? 0) + point.value);
    }
  }
  return [...totals.entries()].sort((a, b) => a[0] - b[0]).map(([ts, value]) => ({ ts, value }));
}

export function latestValue(points: readonly EnergyPoint[]): EnergyPoint | null {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index]!;
    if (point.value != null) return point;
  }
  return null;
}

export function averageValue(points: readonly EnergyPoint[]): number | null {
  return average(points.flatMap((point) => (point.value == null ? [] : [point.value])));
}

/** Points that fall on the given local calendar day. */
export function pointsOnDay(points: readonly EnergyPoint[], dateKey: string, timeZone: string): EnergyPoint[] {
  return points.filter((point) => localDateKey(point.ts, timeZone) === dateKey);
}
