import { useCallback, useMemo, useState } from "react";
import { DataTableView } from "../../../components";
import type { DataTableCell, DataTableColumn } from "../../../components/ui/data-table/types";
import { useAsyncResource } from "../../../react/async-resource";
import { useShortcut } from "../../../react/input";
import { colors } from "../../../theme/colors";
import type { PaneProps } from "../../../types/plugin";
import { getCachedDayAhead, loadDayAhead, zoneDay } from "../entsoe/data";
import { currentPoint, priceStats } from "../entsoe/stats";
import { hasEntsoeToken } from "../entsoe/token";
import {
  DEFAULT_BOARD_ZONES,
  ZONE_REGION_LABELS,
  ZONE_REGION_ORDER,
  getZonesByRegion,
  resolveZone,
  type BiddingZone,
  type ZoneRegion,
} from "../entsoe/zones";
import type { PluginModule } from "../plugin-module";
import { usePluginAppActions, usePluginConfigState } from "../../runtime";
import { useAutoRefresh } from "../shared/auto-refresh";
import { usePaneStatusFooter } from "../shared/pane-footer";
import { DAY_AHEAD_TEMPLATE_ID } from "./day-ahead";
import { formatPrice, signedColor } from "./shared";

export const ZONE_BOARD_PANE_ID = "energy-zone-board";
export const ZONE_BOARD_TEMPLATE_ID = "energy-zone-board-pane";
const BOARD_ZONES_KEY = "boardZones";
const CONCURRENCY = 4;

interface ZoneRowData {
  zone: BiddingZone;
  now: number | null;
  base: number | null;
  peak: number | null;
  offPeak: number | null;
  changePercent: number | null;
  tomorrowBase: number | null;
  tomorrowChangePercent: number | null;
  currency: string | null;
  error: string | null;
}

type BoardRow = { type: "header"; region: ZoneRegion } | { type: "row"; data: ZoneRowData };

const COLUMNS: DataTableColumn[] = [
  { id: "zone", label: "Zone", width: 8, align: "left" },
  { id: "name", label: "Market", width: 14, align: "left", flexGrow: 1 },
  { id: "now", label: "Now", width: 8, align: "right" },
  { id: "base", label: "Base", width: 8, align: "right" },
  { id: "peak", label: "Peak", width: 8, align: "right" },
  { id: "chg", label: "vs Yday", width: 8, align: "right" },
  { id: "tmrw", label: "Tmrw", width: 8, align: "right" },
  { id: "tchg", label: "vs Today", width: 8, align: "right" },
];

function pct(next: number | null, prev: number | null): number | null {
  if (next == null || prev == null || prev === 0) return null;
  return ((next - prev) / Math.abs(prev)) * 100;
}

function emptyRow(zone: BiddingZone, error: string | null = null): ZoneRowData {
  return { zone, now: null, base: null, peak: null, offPeak: null, changePercent: null, tomorrowBase: null, tomorrowChangePercent: null, currency: null, error };
}

async function loadZoneRow(zone: BiddingZone, force: boolean): Promise<ZoneRowData> {
  const today = zoneDay(zone, 0);
  try {
    const [current, previous, next] = await Promise.all([
      loadDayAhead(zone, today, { force }),
      loadDayAhead(zone, zoneDay(zone, -1), { force }).catch(() => null),
      loadDayAhead(zone, zoneDay(zone, 1), { force }).catch(() => null),
    ]);
    const stats = priceStats(current.data.points, zone.timeZone);
    const prevStats = previous ? priceStats(previous.data.points, zone.timeZone) : null;
    const nextStats = next ? priceStats(next.data.points, zone.timeZone) : null;
    return {
      zone,
      now: currentPoint(current.data.points)?.value ?? null,
      base: stats.baseload,
      peak: stats.peak,
      offPeak: stats.offPeak,
      changePercent: pct(stats.baseload, prevStats?.baseload ?? null),
      tomorrowBase: nextStats?.baseload ?? null,
      tomorrowChangePercent: pct(nextStats?.baseload ?? null, stats.baseload),
      currency: current.data.currency,
      error: current.refreshError ?? null,
    };
  } catch (error) {
    return emptyRow(zone, error instanceof Error ? error.message : String(error));
  }
}

async function loadBoard(zones: readonly BiddingZone[], force: boolean): Promise<Map<string, ZoneRowData>> {
  const result = new Map<string, ZoneRowData>();
  const queue = [...zones];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let zone = queue.shift(); zone; zone = queue.shift()) {
      result.set(zone.code, await loadZoneRow(zone, force));
    }
  });
  await Promise.all(workers);
  return result;
}

function cachedBoard(zones: readonly BiddingZone[]): Map<string, ZoneRowData> | null {
  const result = new Map<string, ZoneRowData>();
  for (const zone of zones) {
    const bundle = getCachedDayAhead(zone, zoneDay(zone, 0));
    if (!bundle) continue;
    const stats = priceStats(bundle.data.points, zone.timeZone);
    result.set(zone.code, { ...emptyRow(zone), now: currentPoint(bundle.data.points)?.value ?? null, base: stats.baseload, peak: stats.peak, offPeak: stats.offPeak, currency: bundle.data.currency });
  }
  return result.size ? result : null;
}

function renderCell(row: BoardRow, column: DataTableColumn): DataTableCell {
  if (row.type === "header") return { text: "" };
  const { data } = row;
  switch (column.id) {
    case "zone": return { text: data.zone.code, color: colors.textBright };
    case "name": return data.error
      ? { text: data.error, color: colors.negative }
      : { text: data.zone.name, color: colors.textDim };
    case "now": return { text: formatPrice(data.now), color: colors.text };
    case "base": return { text: formatPrice(data.base), color: colors.textBright };
    case "peak": return { text: formatPrice(data.peak), color: colors.text };
    case "chg": return { text: data.changePercent == null ? "--" : `${data.changePercent >= 0 ? "+" : ""}${data.changePercent.toFixed(1)}%`, color: signedColor(data.changePercent) };
    case "tmrw": return { text: formatPrice(data.tomorrowBase), color: data.tomorrowBase == null ? colors.textMuted : colors.text };
    case "tchg": return { text: data.tomorrowChangePercent == null ? "--" : `${data.tomorrowChangePercent >= 0 ? "+" : ""}${data.tomorrowChangePercent.toFixed(1)}%`, color: signedColor(data.tomorrowChangePercent) };
    default: return { text: "" };
  }
}

// Stable fallback: a fresh array per render would re-derive `zones`, re-create the loader and refetch forever.
const BOARD_ZONES_FALLBACK: string[] = [...DEFAULT_BOARD_ZONES];

function useBoardZones(): BiddingZone[] {
  const [codes] = usePluginConfigState<string[]>(BOARD_ZONES_KEY, BOARD_ZONES_FALLBACK);
  return useMemo(() => codes.map((code) => resolveZone(code)).filter((zone): zone is BiddingZone => zone != null), [codes]);
}

function ZoneBoardPane({ focused, width, height }: PaneProps) {
  const zones = useBoardZones();
  const { createPaneFromTemplate } = usePluginAppActions();
  const tokenReady = hasEntsoeToken();
  const loader = useCallback((force: boolean) => loadBoard(zones, force), [zones]);
  const resource = useAsyncResource(tokenReady ? loader : null, { initialData: () => cachedBoard(zones) });
  const refresh = resource.load;
  useAutoRefresh(resource.updatedAt, refresh);
  useShortcut((event) => {
    if (!focused || event.name !== "r") return;
    event.preventDefault?.();
    event.stopPropagation?.();
    refresh();
  });

  const rows = useMemo<BoardRow[]>(() => {
    const byRegion = getZonesByRegion(zones);
    const result: BoardRow[] = [];
    for (const region of ZONE_REGION_ORDER) {
      const regionZones = byRegion.get(region);
      if (!regionZones?.length) continue;
      result.push({ type: "header", region });
      for (const zone of regionZones) {
        result.push({ type: "row", data: resource.data?.get(zone.code) ?? emptyRow(zone) });
      }
    }
    return result;
  }, [resource.data, zones]);

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const currency = useMemo(() => {
    const set = new Set([...(resource.data?.values() ?? [])].map((row) => row.currency).filter(Boolean));
    return set.size === 1 ? [...set][0]! : null;
  }, [resource.data]);

  usePaneStatusFooter({
    registrationId: "energy-zone-board",
    loading: resource.loading,
    error: resource.error ?? (tokenReady ? null : "ENTSO-E token not configured. Run ENTSOE."),
    info: [
      { id: "unit", parts: [{ text: currency ? `${currency}/MWh baseload` : "day-ahead baseload", tone: "muted" }] },
      { id: "hint", parts: [{ text: "Enter opens DA chart", tone: "muted" }] },
    ],
  });

  return (
    <DataTableView<BoardRow, DataTableColumn>
      focused={focused}
      selection={{
        kind: "id",
        selectedId: selectedCode,
        getId: (row) => row.type === "row" ? row.data.zone.code : `header-${row.region}`,
        onChange: (_id, row) => { if (row.type === "row") setSelectedCode(row.data.zone.code); },
      }}
      isNavigable={(row) => row.type === "row"}
      onActivate={(row) => { if (row.type === "row") createPaneFromTemplate(DAY_AHEAD_TEMPLATE_ID, { arg: row.data.zone.code }); }}
      rootWidth={width}
      rootHeight={height}
      columns={COLUMNS}
      items={rows}
      sortColumnId={null}
      sortDirection="asc"
      onHeaderClick={() => {}}
      getItemKey={(row) => row.type === "header" ? `header-${row.region}` : row.data.zone.code}
      renderSectionHeader={(row) => row.type === "header" ? { text: ZONE_REGION_LABELS[row.region] } : null}
      renderCell={renderCell}
      emptyStateTitle={tokenReady ? "Loading zone prices..." : "Run ENTSOE to add your ENTSO-E API token."}
    />
  );
}

export const zoneBoardModule: PluginModule = {
  panes: [{
    id: ZONE_BOARD_PANE_ID,
    name: "Zone Prices",
    icon: "Z",
    component: ZoneBoardPane,
    defaultPosition: "left",
    defaultMode: "floating",
    defaultFloatingSize: { width: 96, height: 32 },
    tableExport: true,
  }],
  paneTemplates: [{
    id: ZONE_BOARD_TEMPLATE_ID,
    paneId: ZONE_BOARD_PANE_ID,
    label: "Zone Price Board",
    description: "Day-ahead baseload, peak and day-on-day change across European bidding zones.",
    keywords: ["zones", "board", "prices", "day-ahead", "europe", "baseload", "overview", "markets"],
    shortcut: { prefix: "ZP" },
  }],
};
