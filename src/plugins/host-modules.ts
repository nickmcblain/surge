import { PLUGIN_HOST_GLOBAL, SHARED_SPECIFIERS } from "./host-contract";

/**
 * Publishes the host's shared modules for compiled plugin bundles to read.
 *
 * Browser-context renderers load plugins as separate ES modules, so the bundler
 * rewrites their `react` and `surge/*` imports to read from this registry
 * (see `bundle.ts`). This must run before any plugin bundle is imported, and
 * the modules here must be the same instances the app itself uses — importing
 * them normally is what guarantees that.
 */
export async function installPluginHostModules(): Promise<void> {
  const globals = globalThis as Record<string, unknown>;
  if (globals[PLUGIN_HOST_GLOBAL]) return;

  const [
    react,
    jsxRuntime,
    typesPlugin,
    typesPersistence,
    ui,
    components,
    theme,
    capabilities,
    utils,
    pluginReact,
    dialog,
    marketData,
    timeSeries,
  ] = await Promise.all([
    import("react"),
    import("react/jsx-runtime"),
    // Type-only modules still need an entry: a plugin may import a runtime
    // value from them, and a missing key throws a clearer error than undefined.
    import("../types/plugin"),
    import("../types/persistence"),
    import("../ui"),
    import("../components"),
    import("../theme/colors"),
    import("../capabilities"),
    import("../public/utils"),
    import("../public/react"),
    import("../ui/dialog"),
    import("../public/market-data"),
    import("../public/time-series"),
  ]);

  const registry: Record<string, unknown> = {
    "react": react,
    "react/jsx-runtime": jsxRuntime,
    "react/jsx-dev-runtime": jsxRuntime,
    "surge/types/plugin": typesPlugin,
    "surge/types/persistence": typesPersistence,
    "surge/ui": ui,
    "surge/components": components,
    "surge/theme": theme,
    "surge/capabilities": capabilities,
    "surge/utils": utils,
    "surge/react": pluginReact,
    "surge/dialog": dialog,
    "surge/market-data": marketData,
    "surge/time-series": timeSeries,
  };

  for (const specifier of SHARED_SPECIFIERS) {
    if (!registry[specifier]) throw new Error(`Plugin host registry is missing "${specifier}"`);
  }

  globals[PLUGIN_HOST_GLOBAL] = registry;
}
