import type { GloomPlugin } from "../types/plugin";
import { getLoadablePlugins } from "./catalog";
import { loadExternalPlugins, type LoadedExternalPlugin } from "./loader";

export function getDesktopBackendPlugins(
  externalPlugins: LoadedExternalPlugin[] = [],
): GloomPlugin[] {
  return getLoadablePlugins(externalPlugins);
}

export async function loadDesktopBackendPlugins(): Promise<GloomPlugin[]> {
  return getDesktopBackendPlugins(await loadExternalPlugins("desktop"));
}
