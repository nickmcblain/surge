import { useMemo } from "react";
import { colors } from "../../../theme/colors";
import type { EnergyPoint } from "../../../types/energy";
import type { PaneProps } from "../../../types/plugin";
import { Box, Text } from "../../../ui";
import { getCachedDayAhead, loadDayAhead, zoneDay } from "../entsoe/data";
import { priceStats } from "../entsoe/stats";
import { formatLocalTime } from "../entsoe/time";
import type { PluginModule } from "../plugin-module";
import {
  DaySelector,
  EnergyChart,
  EnergyPaneStatus,
  LINE_COLORS,
  formatPrice,
  useDayOffset,
  useEnergyResource,
  useZoneDay,
  useZoneSetting,
  zoneInstance,
  zonePaneSettings,
  type EnergyLine,
} from "./shared";

export const DAY_AHEAD_PANE_ID = "energy-day-ahead";
export const DAY_AHEAD_TEMPLATE_ID = "energy-day-ahead-pane";

/** Shifts the previous day onto the selected day's clock so the two curves overlay hour for hour. */
function overlay(points: readonly EnergyPoint[], shiftMs: number): EnergyPoint[] {
  return points.map((point) => ({ ts: point.ts + shiftMs, value: point.value }));
}

function DayAheadPane({ focused, width, height }: PaneProps) {
  const [zone] = useZoneSetting();
  const [offset, setOffset] = useDayOffset();
  const day = useZoneDay(zone, offset);
  const previous = useMemo(() => zoneDay(zone, offset - 1), [zone, offset]);

  const current = useEnergyResource({
    registrationId: "energy-day-ahead", zone, day, focused, load: loadDayAhead, cached: getCachedDayAhead,
  });
  // The overlay is best-effort: it never blocks the main curve and reports nothing to the footer.
  const cachedPrevious = getCachedDayAhead(zone, previous);

  const stats = useMemo(
    () => (current.bundle ? priceStats(current.bundle.data.points, zone.timeZone) : null),
    [current.bundle, zone.timeZone],
  );

  const lines = useMemo<EnergyLine[]>(() => {
    if (!current.bundle) return [];
    const result: EnergyLine[] = [];
    if (cachedPrevious && cachedPrevious.data.points.length > 0) {
      result.push({
        id: "previous",
        label: previous.dateKey,
        color: LINE_COLORS.secondary,
        points: overlay(cachedPrevious.data.points, day.startMs - previous.startMs),
      });
    }
    result.push({ id: "price", label: day.dateKey, color: LINE_COLORS.primary, points: current.bundle.data.points, style: "step" });
    return result;
  }, [cachedPrevious, current.bundle, day, previous]);

  if (!current.bundle) {
    return <EnergyPaneStatus width={width} height={height} loading={current.loading} error={current.error} label="day-ahead prices" />;
  }

  const unit = current.bundle.data.unit;
  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box flexDirection="row" height={1} paddingX={1} justifyContent="space-between" overflow="hidden">
        <Box flexDirection="row" gap={2} overflow="hidden">
          <Text fg={colors.textDim}>Base <Text fg={colors.textBright}>{formatPrice(stats?.baseload)}</Text></Text>
          <Text fg={colors.textDim}>Peak <Text fg={colors.text}>{formatPrice(stats?.peak)}</Text></Text>
          <Text fg={colors.textDim}>Off <Text fg={colors.text}>{formatPrice(stats?.offPeak)}</Text></Text>
          {stats?.min ? (
            <Text fg={colors.textDim}>Min <Text fg={colors.positive}>{formatPrice(stats.min.value)}</Text> {formatLocalTime(stats.min.ts, zone.timeZone)}</Text>
          ) : null}
          {stats?.max ? (
            <Text fg={colors.textDim}>Max <Text fg={colors.negative}>{formatPrice(stats.max.value)}</Text> {formatLocalTime(stats.max.ts, zone.timeZone)}</Text>
          ) : null}
          <Text fg={colors.textMuted}>{unit}</Text>
        </Box>
        <DaySelector value={offset} onChange={setOffset} />
      </Box>
      <Box flexGrow={1} overflow="hidden">
        <EnergyChart
          lines={lines}
          unit={unit}
          day={day}
          timeZone={zone.timeZone}
          width={width}
          height={Math.max(4, height - 1)}
          focused={focused}
          emptyMessage={offset === 1 ? "Tomorrow's auction results are published around 12:45 CET." : "No day-ahead prices published for this day."}
        />
      </Box>
    </Box>
  );
}

export const dayAheadModule: PluginModule = {
  panes: [{
    id: DAY_AHEAD_PANE_ID,
    name: "Day-Ahead Prices",
    icon: "D",
    component: DayAheadPane,
    defaultPosition: "right",
    defaultMode: "floating",
    defaultFloatingSize: { width: 110, height: 30 },
    settings: zonePaneSettings("Day-Ahead Settings"),
  }],
  paneTemplates: [{
    id: DAY_AHEAD_TEMPLATE_ID,
    paneId: DAY_AHEAD_PANE_ID,
    label: "Day-Ahead Prices",
    description: "Hourly or quarter-hourly day-ahead auction prices for a bidding zone.",
    keywords: ["day-ahead", "da", "price", "auction", "sdac", "epex", "nord pool", "spot", "power", "electricity"],
    shortcut: { prefix: "DA", argPlaceholder: "zone", argKind: "text", argOptional: true },
    createInstance: (_context, options) => zoneInstance("Day-Ahead", options),
  }],
};
