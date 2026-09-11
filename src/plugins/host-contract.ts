/**
 * The contract shared between the plugin bundler and the renderers that load
 * its output.
 *
 * Kept in its own module with no imports on purpose. The bundler runs in Bun
 * and reaches the filesystem; the renderers that consume it are browser
 * contexts. Pulling these two constants from `bundle.ts` dragged the whole
 * bundler — and through it `plugins/loader.ts`, which reads `process.env.HOME`
 * at module scope — into the desktop view, where it threw on load.
 */

export const PLUGIN_HOST_GLOBAL = "__SURGE_PLUGIN_HOST__";

/**
 * Specifiers a plugin may import that must resolve to the host's copy. Anything
 * else is a plugin's own dependency and gets bundled normally.
 *
 * Deliberately no `react-dom`: it is a renderer package, and plugins are
 * required to be renderer-neutral so the same code runs in the terminal. A
 * plugin reaching for it should fail to bundle rather than quietly work on the
 * desktop and break in the TUI.
 */
export const SHARED_SPECIFIERS = [
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "surge/types/plugin",
  "surge/types/persistence",
  "surge/ui",
  "surge/components",
  "surge/theme",
  "surge/capabilities",
  "surge/utils",
  "surge/react",
  // Modules below hold state or reach the host's services, so a bundled copy
  // is worse than a missing one.
  "surge/dialog",
  "surge/market-data",
  "surge/time-series",
] as const;

export type SharedSpecifier = (typeof SHARED_SPECIFIERS)[number];
