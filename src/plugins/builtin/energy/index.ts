import { entsoeModule } from "../entsoe";
import type { PluginModule } from "../plugin-module";
import { calendarModule } from "./calendar";
import { dayAheadModule } from "./day-ahead";
import { flowModule } from "./flow";
import { generationModule } from "./generation";
import { loadModule } from "./load";
import { resModule } from "./res";
import { spreadModule } from "./spread";
import { zoneBoardModule } from "./zone-board";
import { zoneOverviewModule } from "./zone-overview";

/** Every module that makes up the energy plugin, provider first so its setup runs before any pane mounts. */
export const energyModules: readonly PluginModule[] = [
  entsoeModule,
  zoneBoardModule,
  zoneOverviewModule,
  dayAheadModule,
  loadModule,
  resModule,
  flowModule,
  spreadModule,
  generationModule,
  calendarModule,
];

export {
  CALENDAR_PANE_ID,
  CALENDAR_TEMPLATE_ID,
} from "./calendar";
export { DAY_AHEAD_PANE_ID, DAY_AHEAD_TEMPLATE_ID } from "./day-ahead";
export { FLOW_PANE_ID, FLOW_TEMPLATE_ID } from "./flow";
export { GENERATION_PANE_ID, GENERATION_TEMPLATE_ID } from "./generation";
export { LOAD_PANE_ID, LOAD_TEMPLATE_ID } from "./load";
export { RES_PANE_ID, RES_TEMPLATE_ID } from "./res";
export { SPREAD_PANE_ID, SPREAD_TEMPLATE_ID } from "./spread";
export { ZONE_BOARD_PANE_ID, ZONE_BOARD_TEMPLATE_ID } from "./zone-board";
export { ZONE_OVERVIEW_PANE_ID, ZONE_OVERVIEW_TEMPLATE_ID } from "./zone-overview";
