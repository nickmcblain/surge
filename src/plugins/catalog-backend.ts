import type { SurgePlugin } from "../types/plugin";
import { getLoadablePlugins } from "./catalog";
import { loadExternalPlugins, type LoadedExternalPlugin } from "./loader";

export function getDesktopBackendPlugins(
  externalPlugins: LoadedExternalPlugin[] = [],
): SurgePlugin[] {
  return getLoadablePlugins(externalPlugins);
}

export async function loadDesktopBackendPlugins(): Promise<SurgePlugin[]> {
  return getDesktopBackendPlugins(await loadExternalPlugins("desktop"));
}
