import { useCallback, useMemo } from "react";
import { usePaneSettingValue } from "../../../state/app/context";
import { colors } from "../../../theme/colors";
import type { EnergyPoint, EnergySeriesBundle, FlowSeries } from "../../../types/energy";
import type { PaneProps, PaneTemplateCreateOptions, PaneTemplateInstanceConfig } from "../../../types/plugin";
import { Box, Span, Text } from "../../../ui";
import { getCachedFlow, loadFlow } from "../entsoe/data";
import { currentPoint, latestValue } from "../entsoe/stats";
import type { DayWindow } from "../entsoe/time";
import { resolveZone, type BiddingZone } from "../entsoe/zones";
import type { PluginModule } from "../plugin-module";
import {
  DEFAULT_ZONE,
  DaySelector,
  EnergyChart,
  EnergyPaneStatus,
  LINE_COLORS,
  formatMw,
  useDayOffset,
  useEnergyResource,
  useZoneDay,
  useZoneSetting,
  zoneSettingField,
  type EnergyLine,
} from "./shared";

export const FLOW_PANE_ID = "energy-flow";
export const FLOW_TEMPLATE_ID = "energy-flow-pane";

const DEFAULT_COUNTERPARTY = "FR";

interface FlowPair {
  out: FlowSeries;
  back: FlowSeries;
  /** Positive = net export from the pane's zone. */
  net: EnergyPoint[];
}

function netFlow(out: readonly EnergyPoint[], back: readonly EnergyPoint[]): EnergyPoint[] {
  const backByTs = new Map(back.map((point) => [point.ts, point.value]));
  return out.map((point) => {
    const reverse = backByTs.get(point.ts);
    if (point.value == null && reverse == null) return { ts: point.ts, value: null };
    return { ts: point.ts, value: (point.value ?? 0) - (reverse ?? 0) };
  });
}

function pair(out: EnergySeriesBundle<FlowSeries>, back: EnergySeriesBundle<FlowSeries>): EnergySeriesBundle<FlowPair> {
  return {
    data: { out: out.data, back: back.data, net: netFlow(out.data.points, back.data.points) },
    fetchedAt: Math.min(out.fetchedAt, back.fetchedAt),
    stale: out.stale || back.stale,
    source: out.source === "network" || back.source === "network" ? "network" : out.source,
    ...(out.refreshError || back.refreshError ? { refreshError: out.refreshError ?? back.refreshError } : {}),
  };
}

/** Parses "DE-LU FR", "DE-LU>FR" or "DE-LU->FR"; a single zone pairs with FR (or DE-LU). */
export function parseFlowArg(arg: string | undefined): { from: BiddingZone; to: BiddingZone } {
  const parts = (arg ?? "").split(/\s*(?:->|>|to|\s)\s*/i).filter(Boolean);
  const from = resolveZone(parts[0]) ?? resolveZone(DEFAULT_ZONE)!;
  const fallback = from.code === DEFAULT_COUNTERPARTY ? DEFAULT_ZONE : DEFAULT_COUNTERPARTY;
  const to = resolveZone(parts[1]) ?? resolveZone(fallback)!;
  return { from, to };
}

function FlowPane({ focused, width, height }: PaneProps) {
  const [zone] = useZoneSetting();
  const [toCode] = usePaneSettingValue<string>("counterparty", DEFAULT_COUNTERPARTY);
  const to = resolveZone(toCode) ?? resolveZone(DEFAULT_COUNTERPARTY)!;
  const [offset, setOffset] = useDayOffset();
  const day = useZoneDay(zone, offset);

  const load = useCallback(async (from: BiddingZone, window: DayWindow, options?: { force?: boolean }) => {
    const [out, back] = await Promise.all([loadFlow(from, to, window, options), loadFlow(to, from, window, options)]);
    return pair(out, back);
  }, [to]);
  const cached = useCallback((from: BiddingZone, window: DayWindow) => {
    const out = getCachedFlow(from, to, window);
    const back = getCachedFlow(to, from, window);
    return out && back ? pair(out, back) : null;
  }, [to]);

  const { bundle, loading, error } = useEnergyResource({
    registrationId: "energy-flow", zone, day, focused, load, cached,
    info: [{ id: "pair", parts: [{ text: `${zone.code} <> ${to.code}`, tone: "muted" }] }],
  });

  const lines = useMemo<EnergyLine[]>(() => bundle ? [
    { id: "out", label: `${zone.code} > ${to.code}`, color: LINE_COLORS.positive, points: bundle.data.out.points },
    { id: "back", label: `${to.code} > ${zone.code}`, color: LINE_COLORS.negative, points: bundle.data.back.points },
    { id: "net", label: "Net", color: LINE_COLORS.primary, points: bundle.data.net, style: "step" },
  ] : [], [bundle, to.code, zone.code]);

  if (!bundle) return <EnergyPaneStatus width={width} height={height} loading={loading} error={error} label="cross-border flows" />;

  const net = currentPoint(bundle.data.net) ?? latestValue(bundle.data.net);
  const netValue = net?.value ?? null;
  const total = bundle.data.net.reduce((sum, point) => sum + (point.value ?? 0), 0);
  const hours = bundle.data.net.filter((point) => point.value != null).length;

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box flexDirection="row" height={1} paddingX={1} justifyContent="space-between" overflow="hidden">
        <Box flexDirection="row" gap={2} overflow="hidden">
          <Text fg={colors.textDim}>
            Net <Text fg={netValue == null ? colors.neutral : netValue >= 0 ? colors.positive : colors.negative}>
              {netValue == null ? "--" : `${netValue >= 0 ? "export" : "import"} ${formatMw(Math.abs(netValue))}`}
            </Text>
          </Text>
          <Text fg={colors.textDim}>Day avg <Span fg={colors.text}>{hours ? formatMw(total / hours) : "--"}</Span></Text>
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

function flowInstance(options?: PaneTemplateCreateOptions): PaneTemplateInstanceConfig {
  const { from, to } = parseFlowArg(options?.arg);
  return { title: `Flow: ${from.code} <> ${to.code}`, settings: { zone: from.code, counterparty: to.code } };
}

export const flowModule: PluginModule = {
  panes: [{
    id: FLOW_PANE_ID,
    name: "Cross-Border Flow",
    icon: "F",
    component: FlowPane,
    defaultPosition: "right",
    defaultMode: "floating",
    defaultFloatingSize: { width: 110, height: 30 },
    settings: {
      title: "Cross-Border Flow Settings",
      fields: [
        zoneSettingField(),
        { ...zoneSettingField(), key: "counterparty", label: "Counterparty zone" },
      ],
    },
  }],
  paneTemplates: [{
    id: FLOW_TEMPLATE_ID,
    paneId: FLOW_PANE_ID,
    label: "Cross-Border Flow",
    description: "Physical flows on an interconnector in both directions with the net position.",
    keywords: ["flow", "interconnector", "cross-border", "export", "import", "physical", "border"],
    shortcut: { prefix: "FLOW", argPlaceholder: "zone > zone", argKind: "text", argOptional: true },
    createInstance: (_context, options) => flowInstance(options),
  }],
};
