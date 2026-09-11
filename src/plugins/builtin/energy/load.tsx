import { useCallback, useMemo } from "react";
import { colors } from "../../../theme/colors";
import type { EnergySeriesBundle, LoadSeries } from "../../../types/energy";
import type { PaneProps } from "../../../types/plugin";
import { Box, Span, Text } from "../../../ui";
import { getCachedLoad, loadLoad } from "../entsoe/data";
import { currentPoint, latestValue } from "../entsoe/stats";
import type { DayWindow } from "../entsoe/time";
import type { BiddingZone } from "../entsoe/zones";
import type { PluginModule } from "../plugin-module";
import {
  DaySelector,
  EnergyChart,
  EnergyPaneStatus,
  LINE_COLORS,
  formatMw,
  useDayOffset,
  useEnergyResource,
  useZoneDay,
  useZoneSetting,
  zoneInstance,
  zonePaneSettings,
  type EnergyLine,
} from "./shared";

export const LOAD_PANE_ID = "energy-load";
export const LOAD_TEMPLATE_ID = "energy-load-pane";

interface LoadPair {
  actual: LoadSeries;
  forecast: LoadSeries;
}

async function loadPair(zone: BiddingZone, day: DayWindow, options?: { force?: boolean }): Promise<EnergySeriesBundle<LoadPair>> {
  const [actual, forecast] = await Promise.all([
    loadLoad(zone, day, "actual", options),
    loadLoad(zone, day, "forecast", options),
  ]);
  return {
    data: { actual: actual.data, forecast: forecast.data },
    fetchedAt: Math.min(actual.fetchedAt, forecast.fetchedAt),
    stale: actual.stale || forecast.stale,
    source: actual.source === "network" || forecast.source === "network" ? "network" : actual.source,
    ...(actual.refreshError || forecast.refreshError ? { refreshError: actual.refreshError ?? forecast.refreshError } : {}),
  };
}

function cachedPair(zone: BiddingZone, day: DayWindow): EnergySeriesBundle<LoadPair> | null {
  const actual = getCachedLoad(zone, day, "actual");
  const forecast = getCachedLoad(zone, day, "forecast");
  if (!actual || !forecast) return null;
  return {
    data: { actual: actual.data, forecast: forecast.data },
    fetchedAt: Math.min(actual.fetchedAt, forecast.fetchedAt),
    stale: actual.stale || forecast.stale,
    source: "cache",
  };
}

function LoadPane({ focused, width, height }: PaneProps) {
  const [zone] = useZoneSetting();
  const [offset, setOffset] = useDayOffset();
  const day = useZoneDay(zone, offset);
  const load = useCallback(loadPair, []);
  const cached = useCallback(cachedPair, []);
  const { bundle, loading, error } = useEnergyResource({
    registrationId: "energy-load", zone, day, focused, load, cached,
  });

  const lines = useMemo<EnergyLine[]>(() => bundle ? [
    { id: "forecast", label: "Forecast", color: LINE_COLORS.forecast, points: bundle.data.forecast.points },
    { id: "actual", label: "Actual", color: LINE_COLORS.primary, points: bundle.data.actual.points },
  ] : [], [bundle]);

  if (!bundle) return <EnergyPaneStatus width={width} height={height} loading={loading} error={error} label="load" />;

  const now = currentPoint(bundle.data.actual.points);
  const latest = latestValue(bundle.data.actual.points);
  const forecastNow = currentPoint(bundle.data.forecast.points);
  const deviation = latest && forecastNow?.value != null && latest.value != null ? latest.value - forecastNow.value : null;
  const peakForecast = bundle.data.forecast.points.reduce<number | null>((max, point) => (
    point.value != null && (max == null || point.value > max) ? point.value : max
  ), null);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box flexDirection="row" height={1} paddingX={1} justifyContent="space-between" overflow="hidden">
        <Box flexDirection="row" gap={2} overflow="hidden">
          <Text fg={colors.textDim}>Actual <Span fg={colors.textBright}>{formatMw(latest?.value ?? now?.value)}</Span></Text>
          <Text fg={colors.textDim}>Fcst <Span fg={colors.text}>{formatMw(forecastNow?.value)}</Span></Text>
          <Text fg={colors.textDim}>Dev <Span fg={deviation == null ? colors.neutral : deviation > 0 ? colors.negative : colors.positive}>{deviation == null ? "--" : `${deviation > 0 ? "+" : ""}${formatMw(deviation)}`}</Span></Text>
          <Text fg={colors.textDim}>Peak fcst <Span fg={colors.text}>{formatMw(peakForecast)}</Span></Text>
        </Box>
        <DaySelector value={offset} onChange={setOffset} />
      </Box>
      <Box flexGrow={1} overflow="hidden">
        <EnergyChart
          lines={lines}
          unit="MW"
          day={day}
          timeZone={zone.timeZone}
          width={width}
          height={Math.max(4, height - 1)}
          focused={focused}
          formatValue={formatMw}
        />
      </Box>
    </Box>
  );
}

export const loadModule: PluginModule = {
  panes: [{
    id: LOAD_PANE_ID,
    name: "Load",
    icon: "L",
    component: LoadPane,
    defaultPosition: "right",
    defaultMode: "floating",
    defaultFloatingSize: { width: 110, height: 30 },
    settings: zonePaneSettings("Load Settings"),
  }],
  paneTemplates: [{
    id: LOAD_TEMPLATE_ID,
    paneId: LOAD_PANE_ID,
    label: "Load: Actual vs Forecast",
    description: "Actual total load against the day-ahead load forecast for a bidding zone.",
    keywords: ["load", "demand", "consumption", "forecast", "power", "grid"],
    shortcut: { prefix: "LOAD", argPlaceholder: "zone", argKind: "text", argOptional: true },
    createInstance: (_context, options) => zoneInstance("Load", options),
  }],
};
