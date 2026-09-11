import { useEffect, useMemo, useState } from "react";
import { DataTableView } from "../../../components";
import type { DataTableCell, DataTableColumn } from "../../../components/ui/data-table/types";
import { colors } from "../../../theme/colors";
import type { PaneProps } from "../../../types/plugin";
import { localDayWindow, localDateKey } from "../entsoe/time";
import type { PluginModule } from "../plugin-module";

export const CALENDAR_PANE_ID = "energy-calendar";
export const CALENDAR_TEMPLATE_ID = "energy-calendar-pane";

const CET = "Europe/Brussels";

/** 0 = Sunday. */
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5];
const EVERY_DAY: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

interface ScheduleEvent {
  id: string;
  time: string;
  title: string;
  venue: string;
  days: readonly Weekday[];
  tone?: "high" | "normal";
}

/** Recurring European power-market events. Times are CET/CEST. */
const SCHEDULE: readonly ScheduleEvent[] = [
  { id: "ida3", time: "10:00", title: "Intraday auction IDA3 (D) gate closure", venue: "SIDC", days: EVERY_DAY },
  { id: "sdac-gc", time: "12:00", title: "Day-ahead auction gate closure (D+1)", venue: "SDAC", days: EVERY_DAY, tone: "high" },
  { id: "sdac-res", time: "12:45", title: "Day-ahead results published (D+1)", venue: "SDAC", days: EVERY_DAY, tone: "high" },
  { id: "ida1", time: "15:00", title: "Intraday auction IDA1 (D+1) gate closure", venue: "SIDC", days: EVERY_DAY },
  { id: "entsoe-load", time: "18:00", title: "Load forecast & RES forecast (D+1) published", venue: "ENTSO-E", days: EVERY_DAY },
  { id: "agsi", time: "18:00", title: "Gas storage inventories (AGSI+)", venue: "GIE", days: EVERY_DAY },
  { id: "ida2", time: "22:00", title: "Intraday auction IDA2 (D+1) gate closure", venue: "SIDC", days: EVERY_DAY },
  { id: "eua", time: "09:00", title: "EU ETS primary auction", venue: "EEX", days: WEEKDAYS },
  { id: "ttf-settle", time: "17:30", title: "TTF gas futures settlement", venue: "ICE Endex", days: WEEKDAYS },
  { id: "eex-settle", time: "18:00", title: "Power futures settlement", venue: "EEX", days: WEEKDAYS },
  { id: "capacity", time: "09:30", title: "Long-term transmission rights auctions", venue: "JAO", days: [1, 2, 3, 4, 5] },
];

interface CalendarRow {
  event: ScheduleEvent;
  at: number;
  dateKey: string;
  minutesUntil: number;
}

const COLUMNS: DataTableColumn[] = [
  { id: "when", label: "CET", width: 11, align: "left" },
  { id: "in", label: "In", width: 8, align: "right" },
  { id: "title", label: "Event", width: 30, align: "left", flexGrow: 1 },
  { id: "venue", label: "Venue", width: 10, align: "left" },
];

function weekdayOf(ms: number, timeZone: string): Weekday {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(new Date(ms));
  return (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name) as Weekday);
}

/** Next 48 hours of events, past ones from today kept dimmed for context. */
function buildRows(now: number): CalendarRow[] {
  const rows: CalendarRow[] = [];
  for (const offset of [0, 1, 2] as const) {
    const day = localDayWindow(now, CET, offset);
    const weekday = weekdayOf(day.startMs + 12 * 60 * 60_000, CET);
    for (const event of SCHEDULE) {
      if (!event.days.includes(weekday)) continue;
      const [hours, minutes] = event.time.split(":").map(Number);
      // Day window already carries the DST-correct midnight; add wall-clock minutes.
      const at = day.startMs + ((hours ?? 0) * 60 + (minutes ?? 0)) * 60_000;
      if (at < now - 6 * 60 * 60_000 || at > now + 48 * 60 * 60_000) continue;
      rows.push({ event, at, dateKey: day.dateKey, minutesUntil: Math.round((at - now) / 60_000) });
    }
  }
  return rows.sort((a, b) => a.at - b.at);
}

function formatIn(minutes: number): string {
  if (minutes < 0) return "done";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ${minutes % 60}m` : `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function renderCell(row: CalendarRow, column: DataTableColumn, today: string): DataTableCell {
  const past = row.minutesUntil < 0;
  const dim = past ? colors.textMuted : undefined;
  switch (column.id) {
    case "when": return { text: `${row.dateKey === today ? "Today" : row.dateKey.slice(5)} ${row.event.time}`, color: dim ?? colors.textDim };
    case "in": return { text: formatIn(row.minutesUntil), color: dim ?? (row.minutesUntil < 60 ? colors.warning : colors.text) };
    case "title": return { text: row.event.title, color: dim ?? (row.event.tone === "high" ? colors.textBright : colors.text) };
    case "venue": return { text: row.event.venue, color: dim ?? colors.textDim };
    default: return { text: "" };
  }
}

function CalendarPane({ focused, width, height }: PaneProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const rows = useMemo(() => buildRows(now), [now]);
  const today = localDateKey(now, CET);
  const [selected, setSelected] = useState<string | null>(null);
  const nextIndex = rows.findIndex((row) => row.minutesUntil >= 0);

  return (
    <DataTableView<CalendarRow, DataTableColumn>
      focused={focused}
      selection={{
        kind: "id",
        selectedId: selected ?? (nextIndex >= 0 ? `${rows[nextIndex]!.event.id}:${rows[nextIndex]!.dateKey}` : null),
        getId: (row) => `${row.event.id}:${row.dateKey}`,
        onChange: (id) => setSelected(id),
      }}
      rootWidth={width}
      rootHeight={height}
      columns={COLUMNS}
      items={rows}
      sortColumnId={null}
      sortDirection="asc"
      onHeaderClick={() => {}}
      getItemKey={(row) => `${row.event.id}:${row.dateKey}`}
      renderCell={(row, column) => renderCell(row, column, today)}
      emptyStateTitle="No scheduled events."
    />
  );
}

export const calendarModule: PluginModule = {
  panes: [{
    id: CALENDAR_PANE_ID,
    name: "Market Schedule",
    icon: "C",
    component: CalendarPane,
    defaultPosition: "right",
    defaultMode: "floating",
    defaultFloatingSize: { width: 80, height: 24 },
    tableExport: true,
  }],
  paneTemplates: [{
    id: CALENDAR_TEMPLATE_ID,
    paneId: CALENDAR_PANE_ID,
    label: "Market Schedule",
    description: "Upcoming auction gate closures, publications and settlements across European power and gas markets.",
    keywords: ["calendar", "schedule", "auction", "gate closure", "sdac", "sidc", "ida", "events", "eco"],
    shortcut: { prefix: "CAL" },
  }],
};
