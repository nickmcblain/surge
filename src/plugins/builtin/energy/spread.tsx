import { useCallback, useMemo } from "react";
import { usePaneSettingValue } from "../../../state/app/context";
import { colors } from "../../../theme/colors";
import type { EnergyPoint, EnergySeriesBundle, ZonePriceSeries } from "../../../types/energy";
import type { PaneProps, PaneTemplateCreateOptions, PaneTemplateInstanceConfig } from "../../../types/plugin";
import { Box, Span, Text } from "../../../ui";
import { getCachedDayAhead, loadDayAhead } from "../entsoe/data";
import { averageValue, currentPoint } from "../entsoe/stats";
import type { DayWindow } from "../entsoe/time";
import { resolveZone, type BiddingZone } from "../entsoe/zones";
import type { PluginModule } from "../plugin-module";
import { parseFlowArg } from "./flow";
import {
  DaySelector,
  EnergyChart,
  EnergyPaneStatus,
  LINE_COLORS,
  formatPrice,
  signedColor,
  useDayOffset,
  useEnergyResource,
  useZoneDay,
  useZoneSetting,
  zoneSettingField,
  type EnergyLine,
} from "./shared";

export const SPREAD_PANE_ID = "energy-spread";
export const SPREAD_TEMPLATE_ID = "energy-spread-pane";

interface SpreadData {
  a: ZonePriceSeries;
  b: ZonePriceSeries;
  /** a - b per interval; null when either side is missing. */
  spread: EnergyPoint[];
}

function diff(a: readonly EnergyPoint[], b: readonly EnergyPoint[]): EnergyPoint[] {
  const bByTs = new Map(b.map((point) => [point.ts, point.value]));
  return a.map((point) => {
    const other = bByTs.get(point.ts);
    return { ts: point.ts, value: point.value == null || other == null ? null : point.value - other };
  });
}

function combine(a: EnergySeriesBundle<ZonePriceSeries>, b: EnergySeriesBundle<ZonePriceSeries>): EnergySeriesBundle<SpreadData> {
  return {
    data: { a: a.data, b: b.data, spread: diff(a.data.points, b.data.points) },
    fetchedAt: Math.min(a.fetchedAt, b.fetchedAt),
    stale: a.stale || b.stale,
    source: a.source === "network" || b.source === "network" ? "network" : a.source,
    ...(a.refreshError || b.refreshError ? { refreshError: a.refreshError ?? b.refreshError } : {}),
  };
}

function SpreadPane({ focused, width, height }: PaneProps) {
  const [zone] = useZoneSetting();
  const [otherCode] = usePaneSettingValue<string>("counterparty", "FR");
  const other = resolveZone(otherCode) ?? resolveZone("FR")!;
  const [offset, setOffset] = useDayOffset();
  const day = useZoneDay(zone, offset);

  const load = useCallback(async (a: BiddingZone, window: DayWindow, options?: { force?: boolean }) => {
    const [first, second] = await Promise.all([loadDayAhead(a, window, options), loadDayAhead(other, window, options)]);
    return combine(first, second);
  }, [other]);
  const cached = useCallback((a: BiddingZone, window: DayWindow) => {
    const first = getCachedDayAhead(a, window);
    const second = getCachedDayAhead(other, window);
    return first && second ? combine(first, second) : null;
  }, [other]);

  const { bundle, loading, error } = useEnergyResource({
    registrationId: "energy-spread", zone, day, focused, load, cached,
    info: [{ id: "pair", parts: [{ text: `${zone.code} - ${other.code}`, tone: "muted" }] }],
  });

  const lines = useMemo<EnergyLine[]>(() => bundle ? [
    { id: "a", label: zone.code, color: LINE_COLORS.primary, points: bundle.data.a.points },
    { id: "b", label: other.code, color: LINE_COLORS.secondary, points: bundle.data.b.points },
    { id: "spread", label: "Spread", color: LINE_COLORS.forecast, points: bundle.data.spread, style: "step" },
  ] : [], [bundle, other.code, zone.code]);

  if (!bundle) return <EnergyPaneStatus width={width} height={height} loading={loading} error={error} label="spread" />;

  const now = currentPoint(bundle.data.spread);
  const avg = averageValue(bundle.data.spread);
  const mixedCurrency = bundle.data.a.currency !== bundle.data.b.currency;

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box flexDirection="row" height={1} paddingX={1} justifyContent="space-between" overflow="hidden">
        <Box flexDirection="row" gap={2} overflow="hidden">
          <Text fg={colors.textDim}>Now <Span fg={signedColor(now?.value)}>{formatPrice(now?.value)}</Span></Text>
          <Text fg={colors.textDim}>Avg <Span fg={signedColor(avg)}>{formatPrice(avg)}</Span></Text>
          <Text fg={colors.textMuted}>{bundle.data.a.unit}</Text>
          {mixedCurrency ? <Text fg={colors.warning}>mixed currencies</Text> : null}
        </Box>
        <DaySelector value={offset} onChange={setOffset} />
      </Box>
      <Box flexGrow={1} overflow="hidden">
        <EnergyChart
          lines={lines}
          unit={bundle.data.a.unit}
          day={day}
          timeZone={zone.timeZone}
          width={width}
          height={Math.max(4, height - 1)}
          focused={focused}
        />
      </Box>
    </Box>
  );
}

function spreadInstance(options?: PaneTemplateCreateOptions): PaneTemplateInstanceConfig {
  const { from, to } = parseFlowArg(options?.arg);
  return { title: `Spread: ${from.code} - ${to.code}`, settings: { zone: from.code, counterparty: to.code } };
}

export const spreadModule: PluginModule = {
  panes: [{
    id: SPREAD_PANE_ID,
    name: "Zone Spread",
    icon: "S",
    component: SpreadPane,
    defaultPosition: "right",
    defaultMode: "floating",
    defaultFloatingSize: { width: 110, height: 30 },
    settings: {
      title: "Spread Settings",
      fields: [
        zoneSettingField(),
        { ...zoneSettingField(), key: "counterparty", label: "Against zone" },
      ],
    },
  }],
  paneTemplates: [{
    id: SPREAD_TEMPLATE_ID,
    paneId: SPREAD_PANE_ID,
    label: "Day-Ahead Spread",
    description: "Hourly day-ahead price spread between two bidding zones.",
    keywords: ["spread", "differential", "arbitrage", "zone", "price", "day-ahead"],
    shortcut: { prefix: "SPRD", argPlaceholder: "zone zone", argKind: "text", argOptional: true },
    createInstance: (_context, options) => spreadInstance(options),
  }],
};
