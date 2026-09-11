import type { GloomPlugin } from "../types/plugin";
import type { LoadedExternalPlugin } from "./loader";
import { newsPlugin } from "./builtin/news";
import { notesPlugin } from "./builtin/notes";
import { alertsPlugin } from "./builtin/alerts";
import {
  applicationPlugin,
  energyPlugin,
  marketOverviewPlugin,
} from "./builtin/composite-plugins";

export const uiBuiltinPlugins: GloomPlugin[] = [
  applicationPlugin,
  energyPlugin,
  newsPlugin,
  notesPlugin,
  marketOverviewPlugin,
  alertsPlugin,
];

export function getRendererBuiltinPlugins(): GloomPlugin[] {
  return uiBuiltinPlugins;
}

/**
 * The plugin list for a UI renderer: the built-ins it ships with, plus any
 * external plugins that loaded and support this renderer.
 *
 * Deliberately not `getLoadablePlugins`, which is the CLI catalog and also
 * carries the Yahoo fallback provider and the debug plugin. Routing the desktop
 * through it would quietly change which plugins the app runs.
 */
export function getRendererPlugins(externalPlugins: readonly LoadedExternalPlugin[] = []): GloomPlugin[] {
  return [
    ...uiBuiltinPlugins,
    ...externalPlugins
      .filter((entry) => !entry.error && !entry.unsupportedTarget)
      .map((entry) => entry.plugin),
  ];
}
