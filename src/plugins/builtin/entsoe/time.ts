import type { EnergyResolution } from "../../../types/energy";

export const RESOLUTION_MS: Record<EnergyResolution, number> = {
  PT15M: 15 * 60_000,
  PT30M: 30 * 60_000,
  PT60M: 60 * 60_000,
};

export function isEnergyResolution(value: string): value is EnergyResolution {
  return value === "PT15M" || value === "PT30M" || value === "PT60M";
}

/** `yyyyMMddHHmm` in UTC, the only format the ENTSO-E API accepts. */
export function formatEntsoePeriod(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
}

/** Offset of `timeZone` from UTC at `ms`, in minutes. */
function zoneOffsetMinutes(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"), read("second"));
  return Math.round((asUtc - ms) / 60_000);
}

/** Calendar date (`yyyy-mm-dd`) of `ms` in `timeZone`. */
export function localDateKey(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(ms));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

/** UTC instant of local midnight starting the given `yyyy-mm-dd` in `timeZone`. */
export function localMidnightUtc(dateKey: string, timeZone: string): number {
  const [year, month, day] = dateKey.split("-").map(Number) as [number, number, number];
  const guess = Date.UTC(year, month - 1, day);
  // Two passes settle DST transitions: the offset at the guess may differ from the offset at the answer.
  const first = guess - zoneOffsetMinutes(guess, timeZone) * 60_000;
  return guess - zoneOffsetMinutes(first, timeZone) * 60_000;
}

export interface DayWindow {
  dateKey: string;
  startMs: number;
  endMs: number;
}

/** The local trading day containing `ms`, shifted by `offsetDays`. */
export function localDayWindow(ms: number, timeZone: string, offsetDays = 0): DayWindow {
  const baseKey = localDateKey(ms, timeZone);
  const baseStart = localMidnightUtc(baseKey, timeZone);
  const shiftedKey = localDateKey(baseStart + offsetDays * 24 * 60 * 60_000 + 12 * 60 * 60_000, timeZone);
  const startMs = localMidnightUtc(shiftedKey, timeZone);
  const nextKey = localDateKey(startMs + 36 * 60 * 60_000, timeZone);
  return { dateKey: shiftedKey, startMs, endMs: localMidnightUtc(nextKey, timeZone) };
}

export function formatLocalTime(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(ms));
}
