import { useCallback, type ReactNode } from "react";
import { colors } from "../../../theme/colors";
import type { EnergyPoint, EnergySeriesBundle, GenerationMix, LoadSeries, PsrType, ZonePriceSeries } from "../../../types/energy";
import type { PaneProps } from "../../../types/plugin";
import { Box, Text, TextAttributes } from "../../../ui";
import { getCachedDayAhead, getCachedGeneration, getCachedLoad, getCachedResForecast, loadDayAhead, loadGeneration, loadLoad, loadResForecast, zoneDay } from "../entsoe/data";
import { psrDef } from "../entsoe/psr";
import { currentPoint, latestValue, priceStats, sumPoints, type PriceStats } from "../entsoe/stats";
import { formatLocalTime, type DayWindow } from "../entsoe/time";
import type { BiddingZone } from "../entsoe/zones";
import type { PluginModule } from "../plugin-module";
import {
  EnergyPaneStatus,
  formatMw,
  formatPrice,
  signedColor,
  useEnergyResource,
  useZoneDay,
  useZoneSetting,
  zoneInstance,
  zonePaneSettings,
} from "./shared";

export const ZONE_OVERVIEW_PANE_ID = "energy-zone-overview";
export const ZONE_OVERVIEW_TEMPLATE_ID = "energy-zone-overview-pane";

interface Overview {
  today: ZonePriceSeries | null;
  yesterday: ZonePriceSeries | null;
  tomorrow: ZonePriceSeries | null;
  loadActual: LoadSeries | null;
  loadForecast: LoadSeries | null;
  resForecast: GenerationMix | null;
  generation: GenerationMix | null;
}

type Bundle<T> = EnergySeriesBundle<T>;

const settle = <T,>(promise: Promise<Bundle<T>>) => promise.then((bundle) => bundle, () => null);

async function loadOverview(zone: BiddingZone, day: DayWindow, options?: { force?: boolean }): Promise<Bundle<Overview>> {
  const today = await loadDayAhead(zone, day, options);
  const [yesterday, tomorrow, loadActual, loadForecast, resForecast, generation] = await Promise.all([
    settle(loadDayAhead(zone, zoneDay(zone, -1), options)),
    settle(loadDayAhead(zone, zoneDay(zone, 1), options)),
    settle(loadLoad(zone, day, "actual", options)),
    settle(loadLoad(zone, day, "forecast", options)),
    settle(loadResForecast(zone, day, options)),
    settle(loadGeneration(zone, day, options)),
  ]);
  return {
    data: {
      today: today.data,
      yesterday: yesterday?.data ?? null,
      tomorrow: tomorrow?.data ?? null,
      loadActual: loadActual?.data ?? null,
      loadForecast: loadForecast?.data ?? null,
      resForecast: resForecast?.data ?? null,
      generation: generation?.data ?? null,
    },
    fetchedAt: today.fetchedAt,
    stale: today.stale,
    source: today.source,
    ...(today.refreshError ? { refreshError: today.refreshError } : {}),
  };
}

function cachedOverview(zone: BiddingZone, day: DayWindow): Bundle<Overview> | null {
  const today = getCachedDayAhead(zone, day);
  if (!today) return null;
  return {
    ...today,
    data: {
      today: today.data,
      yesterday: getCachedDayAhead(zone, zoneDay(zone, -1))?.data ?? null,
      tomorrow: getCachedDayAhead(zone, zoneDay(zone, 1))?.data ?? null,
      loadActual: getCachedLoad(zone, day, "actual")?.data ?? null,
      loadForecast: getCachedLoad(zone, day, "forecast")?.data ?? null,
      resForecast: getCachedResForecast(zone, day)?.data ?? null,
      generation: getCachedGeneration(zone, day)?.data ?? null,
    },
  };
}

function Row({ label, value, color = colors.text, suffix }: { label: string; value: string; color?: string; suffix?: string }) {
  return (
    <Box flexDirection="row" justifyContent="space-between" height={1}>
      <Text fg={colors.textDim}>{label}</Text>
      <Text fg={color}>{value}{suffix ? <Text fg={colors.textMuted}> {suffix}</Text> : null}</Text>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text fg={colors.textMuted}>{title.toUpperCase()}</Text>
      {children}
    </Box>
  );
}

function pctText(next: number | null, prev: number | null): { text: string; color: string } {
  if (next == null || prev == null || prev === 0) return { text: "", color: colors.neutral };
  const change = ((next - prev) / Math.abs(prev)) * 100;
  return { text: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`, color: signedColor(change) };
}

function topSources(mix: GenerationMix, count: number): Array<{ code: PsrType; value: number; share: number }> {
  const entries = (Object.entries(mix.byType) as [PsrType, EnergyPoint[]][])
    .map(([code, points]) => ({ code, value: (currentPoint(points) ?? latestValue(points))?.value ?? 0 }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  return entries.slice(0, count).map((entry) => ({ ...entry, share: total > 0 ? (entry.value / total) * 100 : 0 }));
}

function ZoneOverviewPane({ focused, width, height }: PaneProps) {
  const [zone] = useZoneSetting();
  const day = useZoneDay(zone, 0);
  const load = useCallback(loadOverview, []);
  const cached = useCallback(cachedOverview, []);
  const { bundle, loading, error } = useEnergyResource({
    registrationId: "energy-zone-overview", zone, day, focused, load, cached,
  });

  if (!bundle) return <EnergyPaneStatus width={width} height={height} loading={loading} error={error} label="zone overview" />;

  const { today, yesterday, tomorrow, loadActual, loadForecast, resForecast, generation } = bundle.data;
  const stats = today ? priceStats(today.points, zone.timeZone) : null;
  const yStats = yesterday ? priceStats(yesterday.points, zone.timeZone) : null;
  const tStats: PriceStats | null = tomorrow && tomorrow.points.length ? priceStats(tomorrow.points, zone.timeZone) : null;
  const now = today ? currentPoint(today.points) : null;
  const dayChange = pctText(stats?.baseload ?? null, yStats?.baseload ?? null);
  const tomorrowChange = pctText(tStats?.baseload ?? null, stats?.baseload ?? null);
  const loadNow = loadActual ? latestValue(loadActual.points) : null;
  const loadFcstNow = loadForecast ? currentPoint(loadForecast.points) : null;
  const windNow = resForecast ? currentPoint(sumPoints([resForecast.byType.B19 ?? [], resForecast.byType.B18 ?? []])) : null;
  const solarNow = resForecast ? currentPoint(resForecast.byType.B16 ?? []) : null;
  const resShare = loadFcstNow?.value && windNow && solarNow
    ? (((windNow.value ?? 0) + (solarNow.value ?? 0)) / loadFcstNow.value) * 100
    : null;
  const stack = generation ? topSources(generation, 4) : [];

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={1} overflow="hidden">
      <Box flexDirection="row" justifyContent="space-between" height={1} marginBottom={1}>
        <Text fg={colors.textBright} attributes={TextAttributes.BOLD}>{zone.code} <Text fg={colors.textDim}>{zone.name}</Text></Text>
        <Text fg={colors.textMuted}>{day.dateKey} {zone.timeZone}</Text>
      </Box>
      <Section title={`Day-ahead ${today?.unit ?? ""}`}>
        <Row label="Now" value={formatPrice(now?.value)} color={colors.textBright} suffix={now ? formatLocalTime(now.ts, zone.timeZone) : undefined} />
        <Row label="Baseload" value={formatPrice(stats?.baseload)} suffix={dayChange.text} />
        <Row label="Peak / Off-peak" value={`${formatPrice(stats?.peak)} / ${formatPrice(stats?.offPeak)}`} />
        <Row label="Min / Max" value={`${formatPrice(stats?.min?.value)} / ${formatPrice(stats?.max?.value)}`} />
        <Row
          label="Tomorrow base"
          value={tStats ? formatPrice(tStats.baseload) : "not published"}
          color={tStats ? tomorrowChange.color : colors.textMuted}
          suffix={tomorrowChange.text || undefined}
        />
      </Section>
      <Section title="Load">
        <Row label="Actual" value={formatMw(loadNow?.value)} color={colors.textBright} />
        <Row label="Forecast now" value={formatMw(loadFcstNow?.value)} />
      </Section>
      <Section title="Renewables forecast">
        <Row label="Wind" value={formatMw(windNow?.value)} />
        <Row label="Solar" value={formatMw(solarNow?.value)} />
        <Row label="Wind+solar / load" value={resShare == null ? "--" : `${resShare.toFixed(0)}%`} color={colors.positive} />
      </Section>
      {stack.length ? (
        <Section title="Generation stack">
          {stack.map((entry) => (
            <Row key={entry.code} label={psrDef(entry.code).label} value={formatMw(entry.value)} suffix={`${entry.share.toFixed(0)}%`} />
          ))}
        </Section>
      ) : null}
    </Box>
  );
}

export const zoneOverviewModule: PluginModule = {
  panes: [{
    id: ZONE_OVERVIEW_PANE_ID,
    name: "Zone Overview",
    icon: "O",
    component: ZoneOverviewPane,
    defaultPosition: "left",
    defaultMode: "floating",
    defaultFloatingSize: { width: 48, height: 30 },
    settings: zonePaneSettings("Zone Overview Settings"),
  }],
  paneTemplates: [{
    id: ZONE_OVERVIEW_TEMPLATE_ID,
    paneId: ZONE_OVERVIEW_PANE_ID,
    label: "Zone Overview",
    description: "Prices, load, renewables and generation stack for one bidding zone at a glance.",
    keywords: ["zone", "overview", "summary", "snapshot", "market", "bidding zone"],
    shortcut: { prefix: "ZONE", argPlaceholder: "zone", argKind: "text", argOptional: true },
    createInstance: (_context, options) => zoneInstance("Zone", options),
  }],
};
