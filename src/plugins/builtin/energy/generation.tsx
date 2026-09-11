import { useMemo, useState } from "react";
import { DataTableView } from "../../../components";
import type { DataTableCell, DataTableColumn } from "../../../components/ui/data-table/types";
import { colors } from "../../../theme/colors";
import type { EnergyPoint, GenerationMix, PsrType } from "../../../types/energy";
import type { PaneProps } from "../../../types/plugin";
import { getCachedGeneration, loadGeneration } from "../entsoe/data";
import { PSR_GROUP_LABELS, PSR_GROUP_ORDER, psrDef, type PsrGroup } from "../entsoe/psr";
import { averageValue, currentPoint, latestValue } from "../entsoe/stats";
import type { PluginModule } from "../plugin-module";
import {
  EnergyPaneStatus,
  formatMw,
  useDayOffset,
  useEnergyResource,
  useZoneDay,
  useZoneSetting,
  zoneInstance,
  zonePaneSettings,
} from "./shared";

export const GENERATION_PANE_ID = "energy-generation";
export const GENERATION_TEMPLATE_ID = "energy-generation-pane";

interface GenRowData {
  code: PsrType;
  label: string;
  group: PsrGroup;
  now: number | null;
  share: number | null;
  average: number | null;
  peak: number | null;
}

type GenRow = { type: "header"; group: PsrGroup; total: number | null } | { type: "row"; data: GenRowData };

const COLUMNS: DataTableColumn[] = [
  { id: "source", label: "Source", width: 20, align: "left", flexGrow: 1 },
  { id: "now", label: "Now", width: 10, align: "right" },
  { id: "share", label: "Share", width: 7, align: "right" },
  { id: "avg", label: "Day avg", width: 10, align: "right" },
  { id: "peak", label: "Peak", width: 10, align: "right" },
];

function peakValue(points: readonly EnergyPoint[]): number | null {
  return points.reduce<number | null>((max, point) => (point.value != null && (max == null || point.value > max) ? point.value : max), null);
}

function buildRows(mix: GenerationMix): GenRow[] {
  const entries = (Object.entries(mix.byType) as [PsrType, EnergyPoint[]][])
    .filter(([, points]) => points.some((point) => point.value != null && point.value > 0));
  const nowByCode = new Map(entries.map(([code, points]) => [code, (currentPoint(points) ?? latestValue(points))?.value ?? null]));
  const totalNow = [...nowByCode.values()].reduce<number>((sum, value) => sum + (value ?? 0), 0);

  const byGroup = new Map<PsrGroup, GenRowData[]>();
  for (const [code, points] of entries) {
    const def = psrDef(code);
    const now = nowByCode.get(code) ?? null;
    const row: GenRowData = {
      code,
      label: def.label,
      group: def.group,
      now,
      share: now != null && totalNow > 0 ? (now / totalNow) * 100 : null,
      average: averageValue(points),
      peak: peakValue(points),
    };
    byGroup.set(def.group, [...(byGroup.get(def.group) ?? []), row]);
  }

  const rows: GenRow[] = [];
  for (const group of PSR_GROUP_ORDER) {
    const groupRows = byGroup.get(group);
    if (!groupRows?.length) continue;
    groupRows.sort((a, b) => (b.now ?? -1) - (a.now ?? -1));
    const total = groupRows.reduce<number>((sum, row) => sum + (row.now ?? 0), 0);
    rows.push({ type: "header", group, total: totalNow > 0 ? (total / totalNow) * 100 : null });
    rows.push(...groupRows.map((data) => ({ type: "row" as const, data })));
  }
  return rows;
}

function renderCell(row: GenRow, column: DataTableColumn): DataTableCell {
  if (row.type === "header") return { text: "" };
  const { data } = row;
  switch (column.id) {
    case "source": return { text: data.label, color: colors.textBright };
    case "now": return { text: formatMw(data.now), color: colors.text };
    case "share": return { text: data.share == null ? "--" : `${data.share.toFixed(1)}%`, color: colors.textDim };
    case "avg": return { text: formatMw(data.average), color: colors.textDim };
    case "peak": return { text: formatMw(data.peak), color: colors.textDim };
    default: return { text: "" };
  }
}

function GenerationPane({ focused, width, height }: PaneProps) {
  const [zone] = useZoneSetting();
  const [offset] = useDayOffset();
  const day = useZoneDay(zone, offset);
  const { bundle, loading, error } = useEnergyResource({
    registrationId: "energy-generation", zone, day, focused, load: loadGeneration, cached: getCachedGeneration,
  });
  const rows = useMemo(() => (bundle ? buildRows(bundle.data) : []), [bundle]);
  const [selected, setSelected] = useState<string | null>(null);

  if (!bundle) return <EnergyPaneStatus width={width} height={height} loading={loading} error={error} label="generation mix" />;

  return (
    <DataTableView<GenRow, DataTableColumn>
      focused={focused}
      selection={{
        kind: "id",
        selectedId: selected,
        getId: (row) => row.type === "row" ? row.data.code : `header-${row.group}`,
        onChange: (_id, row) => { if (row.type === "row") setSelected(row.data.code); },
      }}
      isNavigable={(row) => row.type === "row"}
      rootWidth={width}
      rootHeight={height}
      columns={COLUMNS}
      items={rows}
      sortColumnId={null}
      sortDirection="desc"
      onHeaderClick={() => {}}
      getItemKey={(row) => row.type === "header" ? `header-${row.group}` : row.data.code}
      renderSectionHeader={(row) => row.type === "header"
        ? { text: row.total == null ? PSR_GROUP_LABELS[row.group] : `${PSR_GROUP_LABELS[row.group]}  ${row.total.toFixed(0)}%` }
        : null}
      renderCell={renderCell}
      emptyStateTitle="No generation data published for this day yet."
    />
  );
}

export const generationModule: PluginModule = {
  panes: [{
    id: GENERATION_PANE_ID,
    name: "Generation Mix",
    icon: "G",
    component: GenerationPane,
    defaultPosition: "left",
    defaultMode: "floating",
    defaultFloatingSize: { width: 72, height: 30 },
    tableExport: true,
    settings: zonePaneSettings("Generation Mix Settings"),
  }],
  paneTemplates: [{
    id: GENERATION_TEMPLATE_ID,
    paneId: GENERATION_PANE_ID,
    label: "Generation Mix",
    description: "Actual generation per production type with current share of the stack.",
    keywords: ["generation", "gen", "mix", "fuel", "stack", "nuclear", "gas", "coal", "hydro", "wind", "solar"],
    shortcut: { prefix: "GEN", argPlaceholder: "zone", argKind: "text", argOptional: true },
    createInstance: (_context, options) => zoneInstance("Generation", options),
  }],
};
