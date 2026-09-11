import { useCallback, useMemo } from "react";
import { colors } from "../../../theme/colors";
import type { EnergyPoint, EnergySeriesBundle, GenerationMix } from "../../../types/energy";
import type { PaneProps } from "../../../types/plugin";
import { Box, Text } from "../../../ui";
import { getCachedGeneration, getCachedResForecast, loadGeneration, loadResForecast } from "../entsoe/data";
import { currentPoint, sumPoints } from "../entsoe/stats";
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

export const RES_PANE_ID = "energy-res";
export const RES_TEMPLATE_ID = "energy-res-pane";

interface ResPair {
  forecast: GenerationMix;
  /** Actual generation may be absent for tomorrow. */
  actual: GenerationMix | null;
}

function windPoints(mix: GenerationMix): EnergyPoint[] {
  return sumPoints([mix.byType.B19 ?? [], mix.byType.B18 ?? []]);
}

function solarPoints(mix: GenerationMix): EnergyPoint[] {
  return mix.byType.B16 ?? [];
}

async function loadPair(zone: BiddingZone, day: DayWindow, options?: { force?: boolean }): Promise<EnergySeriesBundle<ResPair>> {
  const forecast = await loadResForecast(zone, day, options);
  const actual = await loadGeneration(zone, day, options).catch(() => null);
  return {
    data: { forecast: forecast.data, actual: actual?.data ?? null },
    fetchedAt: forecast.fetchedAt,
    stale: forecast.stale,
    source: forecast.source,
    ...(forecast.refreshError ? { refreshError: forecast.refreshError } : {}),
  };
}

function cachedPair(zone: BiddingZone, day: DayWindow): EnergySeriesBundle<ResPair> | null {
  const forecast = getCachedResForecast(zone, day);
  if (!forecast) return null;
  return { ...forecast, data: { forecast: forecast.data, actual: getCachedGeneration(zone, day)?.data ?? null } };
}

function ResPane({ focused, width, height }: PaneProps) {
  const [zone] = useZoneSetting();
  const [offset, setOffset] = useDayOffset();
  const day = useZoneDay(zone, offset);
  const load = useCallback(loadPair, []);
  const cached = useCallback(cachedPair, []);
  const { bundle, loading, error } = useEnergyResource({
    registrationId: "energy-res", zone, day, focused, load, cached,
  });

  const lines = useMemo<EnergyLine[]>(() => {
    if (!bundle) return [];
    const result: EnergyLine[] = [
      { id: "wind-fcst", label: "Wind fcst", color: LINE_COLORS.wind, points: windPoints(bundle.data.forecast) },
      { id: "solar-fcst", label: "Solar fcst", color: LINE_COLORS.solar, points: solarPoints(bundle.data.forecast) },
    ];
    if (bundle.data.actual) {
      result.push(
        { id: "wind", label: "Wind", color: LINE_COLORS.primary, points: windPoints(bundle.data.actual), style: "step" },
        { id: "solar", label: "Solar", color: colors.text, points: solarPoints(bundle.data.actual), style: "step" },
      );
    }
    return result;
  }, [bundle]);

  if (!bundle) return <EnergyPaneStatus width={width} height={height} loading={loading} error={error} label="wind & solar forecast" />;

  const windNow = currentPoint(windPoints(bundle.data.forecast));
  const solarNow = currentPoint(solarPoints(bundle.data.forecast));
  const windActual = bundle.data.actual ? currentPoint(windPoints(bundle.data.actual)) : null;
  const solarActual = bundle.data.actual ? currentPoint(solarPoints(bundle.data.actual)) : null;

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box flexDirection="row" height={1} paddingX={1} justifyContent="space-between" overflow="hidden">
        <Box flexDirection="row" gap={2} overflow="hidden">
          <Text fg={colors.textDim}>Wind <Text fg={colors.textBright}>{formatMw(windActual?.value ?? windNow?.value)}</Text>{windActual ? <Text fg={colors.textMuted}> / fcst {formatMw(windNow?.value)}</Text> : null}</Text>
          <Text fg={colors.textDim}>Solar <Text fg={colors.textBright}>{formatMw(solarActual?.value ?? solarNow?.value)}</Text>{solarActual ? <Text fg={colors.textMuted}> / fcst {formatMw(solarNow?.value)}</Text> : null}</Text>
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

export const resModule: PluginModule = {
  panes: [{
    id: RES_PANE_ID,
    name: "Wind & Solar",
    icon: "R",
    component: ResPane,
    defaultPosition: "right",
    defaultMode: "floating",
    defaultFloatingSize: { width: 110, height: 30 },
    settings: zonePaneSettings("Wind & Solar Settings"),
  }],
  paneTemplates: [{
    id: RES_TEMPLATE_ID,
    paneId: RES_PANE_ID,
    label: "Wind & Solar Forecast",
    description: "Day-ahead wind and solar generation forecast against actual output.",
    keywords: ["res", "renewables", "wind", "solar", "forecast", "generation", "intermittent"],
    shortcut: { prefix: "RES", argPlaceholder: "zone", argKind: "text", argOptional: true },
    createInstance: (_context, options) => zoneInstance("Wind & Solar", options),
  }],
};
