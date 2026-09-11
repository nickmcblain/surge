import { useCallback, useMemo } from "react";
import { EmptyState, PaneStatusBody, SegmentedControl, type PaneFooterSegment } from "../../../components";
import { CompositeChart } from "../../../components/chart/composite";
import { scalarPoint, staticSeries } from "../../../components/chart/static/series";
import { useAsyncResource } from "../../../react/async-resource";
import { useShortcut } from "../../../react/input";
import { usePaneSettingValue } from "../../../state/app/context";
import { blendHex, colors } from "../../../theme/colors";
import type { ResolvedSeries } from "../../../time-series/types";
import type { EnergyPoint, EnergySeriesBundle } from "../../../types/energy";
import type { PaneSettingsDef, PaneTemplateCreateOptions, PaneTemplateInstanceConfig } from "../../../types/plugin";
import { Box, Text } from "../../../ui";
import { formatNumber } from "../../../utils/format";
import { usePluginPaneState } from "../../runtime";
import { zoneDay } from "../entsoe/data";
import type { DayWindow } from "../entsoe/time";
import { formatLocalTime } from "../entsoe/time";
import { hasEntsoeToken } from "../entsoe/token";
import { BIDDING_ZONES, resolveZone, type BiddingZone } from "../entsoe/zones";
import { useAutoRefresh } from "../shared/auto-refresh";
import { usePaneStatusFooter } from "../shared/pane-footer";

export const DEFAULT_ZONE = "DE-LU";

export type DayOffset = -1 | 0 | 1;

export const DAY_OPTIONS = [
  { value: "-1", label: "Yesterday" },
  { value: "0", label: "Today" },
  { value: "1", label: "Tomorrow" },
];

/** The zone a pane is bound to, from its settings; falls back to DE-LU. */
export function useZoneSetting(): [BiddingZone, (code: string) => void] {
  const [code, setCode] = usePaneSettingValue<string>("zone", DEFAULT_ZONE);
  const zone = resolveZone(code) ?? resolveZone(DEFAULT_ZONE)!;
  return [zone, setCode];
}

export function useDayOffset(): [DayOffset, (offset: DayOffset) => void] {
  const [offset, setOffset] = usePluginPaneState<DayOffset>("day", 0);
  return [offset, setOffset];
}

export function zoneSettingField() {
  return {
    key: "zone",
    label: "Bidding zone",
    type: "select" as const,
    options: BIDDING_ZONES.map((zone) => ({ value: zone.code, label: zone.code, description: zone.name })),
  };
}

export function zonePaneSettings(title: string): PaneSettingsDef {
  return { title, fields: [zoneSettingField()] };
}

/** Shared `createInstance` for `<CMD> <zone>` templates. */
export function zoneInstance(
  label: string,
  options?: PaneTemplateCreateOptions,
): PaneTemplateInstanceConfig {
  const zone = resolveZone(options?.arg) ?? resolveZone(DEFAULT_ZONE)!;
  return { title: `${label}: ${zone.code}`, settings: { zone: zone.code } };
}

export interface EnergyLine {
  id: string;
  label: string;
  color: string;
  points: readonly EnergyPoint[];
  style?: ResolvedSeries["style"];
}

export function toResolvedSeries(line: EnergyLine, unit: string): ResolvedSeries {
  return {
    ...staticSeries(
      line.points.map((point) => scalarPoint(new Date(point.ts), point.value)),
      { id: line.id, label: line.label, color: line.color, style: line.style, calendarSpaced: true },
    ),
    unit,
    unitGroup: unit,
  };
}

const PANELS = [{ id: "main" }];

export function formatPrice(value: number | null | undefined): string {
  return value == null ? "--" : formatNumber(value, 2);
}

export function formatMw(value: number | null | undefined): string {
  if (value == null) return "--";
  return Math.abs(value) >= 10_000 ? `${formatNumber(value / 1000, 1)} GW` : `${formatNumber(value, 0)} MW`;
}

export function signedColor(value: number | null | undefined): string {
  if (value == null || value === 0) return colors.neutral;
  return value > 0 ? colors.positive : colors.negative;
}

/** Local hour labels every six hours, with the cursor mapped back to local time. */
function dayAxis(day: DayWindow, timeZone: string) {
  const span = day.endMs - day.startMs;
  const labels = [0, 6, 12, 18].map((hour) => formatLocalTime(day.startMs + hour * 60 * 60_000, timeZone));
  return {
    labels: [...labels, formatLocalTime(day.startMs, timeZone)],
    formatCursor: (ratio: number) => formatLocalTime(day.startMs + Math.min(1, Math.max(0, ratio)) * span, timeZone),
  };
}

export function EnergyChart({
  lines,
  unit,
  day,
  timeZone,
  width,
  height,
  focused,
  formatValue = formatPrice,
  emptyMessage = "No data published for this day yet.",
}: {
  lines: EnergyLine[];
  unit: string;
  day: DayWindow;
  timeZone: string;
  width: number;
  height: number;
  focused: boolean;
  formatValue?: (value: number) => string;
  emptyMessage?: string;
}) {
  const series = useMemo(() => lines.map((line) => toResolvedSeries(line, unit)), [lines, unit]);
  const hasData = series.some((entry) => entry.points.some((point) => point.value != null));
  const viewport = useMemo(() => ({ start: new Date(day.startMs), end: new Date(day.endMs) }), [day.endMs, day.startMs]);
  const xAxis = useMemo(() => dayAxis(day, timeZone), [day, timeZone]);
  if (!hasData) {
    return (
      <Box width={width} height={height} justifyContent="center" alignItems="center">
        <Text fg={colors.textMuted}>{emptyMessage}</Text>
      </Box>
    );
  }
  return (
    <CompositeChart
      series={series}
      panels={PANELS}
      width={width}
      height={height}
      focused={focused}
      interactive
      navigable={false}
      showLegend={lines.length > 1}
      showTimeAxis
      xAxis={xAxis}
      viewport={viewport}
      viewportResetKey={`${day.dateKey}:${lines.map((line) => line.id).join(",")}`}
      clipToViewport
      axisWidth={9}
      colors={{ background: colors.bg, grid: colors.border, crosshair: colors.borderFocused, text: colors.textDim }}
      formatValue={(value) => formatValue(value)}
      formatAxisValue={(value) => formatValue(value)}
      emptyMessage={emptyMessage}
    />
  );
}

export function DaySelector({ value, onChange }: { value: DayOffset; onChange: (offset: DayOffset) => void }) {
  return (
    <SegmentedControl
      options={DAY_OPTIONS}
      value={String(value)}
      onChange={(next) => onChange(Number(next) as DayOffset)}
    />
  );
}

/**
 * Loads one bundle for (zone, day), refreshes on `r` and on the app cadence, and
 * publishes loading/error/staleness to the pane footer. Panes stay declarative.
 */
export function useEnergyResource<T>({
  registrationId,
  zone,
  day,
  focused,
  load,
  cached,
  info = [],
}: {
  registrationId: string;
  zone: BiddingZone;
  day: DayWindow;
  focused: boolean;
  load: (zone: BiddingZone, day: DayWindow, options?: { force?: boolean }) => Promise<EnergySeriesBundle<T>>;
  cached: (zone: BiddingZone, day: DayWindow) => EnergySeriesBundle<T> | null;
  info?: readonly PaneFooterSegment[];
}) {
  const tokenReady = hasEntsoeToken();
  const loader = useCallback(
    (force: boolean) => load(zone, day, { force }),
    [day, load, zone],
  );
  const resource = useAsyncResource(tokenReady ? loader : null, { initialData: () => cached(zone, day) });
  const refresh = resource.load;
  useAutoRefresh(resource.updatedAt, refresh);
  useShortcut((event) => {
    if (!focused || event.name !== "r") return;
    event.preventDefault?.();
    event.stopPropagation?.();
    refresh();
  });
  const bundle = resource.data;
  const error = resource.error ?? bundle?.refreshError ?? (tokenReady ? null : "ENTSO-E token not configured. Run ENTSOE.");
  const footer = useMemo<PaneFooterSegment[]>(() => {
    const segments: PaneFooterSegment[] = [
      { id: "day", parts: [{ text: `${zone.code} ${day.dateKey}`, tone: "muted" }] },
      ...info,
    ];
    if (bundle?.stale) segments.push({ id: "stale", parts: [{ text: "STALE", tone: "warning", bold: true }] });
    return segments;
  }, [bundle?.stale, day.dateKey, info, zone.code]);
  usePaneStatusFooter({ registrationId, loading: resource.loading, error, info: footer });
  return { bundle, loading: resource.loading, error, refresh };
}

export function EnergyPaneStatus({
  width,
  height,
  loading,
  error,
  label,
}: {
  width: number;
  height: number;
  loading: boolean;
  error: string | null;
  label: string;
}) {
  if (loading && !error) {
    return <PaneStatusBody loading align="center" width={width} height={height} loadingLabel={`Loading ${label}...`} />;
  }
  return (
    <Box width={width} height={height} padding={1} flexDirection="column">
      <EmptyState status={error ? "error" : "empty"} title={error ? `${label} unavailable.` : `No ${label}.`} message={error ?? undefined} />
    </Box>
  );
}

export function useZoneDay(zone: BiddingZone, offset: DayOffset): DayWindow {
  // Recomputed on zone/offset change; the day boundary itself moves slowly enough that a refresh re-derives it.
  return useMemo(() => zoneDay(zone, offset), [zone, offset]);
}

export const LINE_COLORS = {
  primary: colors.textBright,
  secondary: blendHex(colors.textDim, colors.bg, 0.2),
  forecast: colors.warning,
  wind: colors.borderFocused,
  solar: colors.warning,
  positive: colors.positive,
  negative: colors.negative,
};
