import { getSharedRegistry } from "../../plugins/registry";
import type { SurgeSlots } from "../../types/plugin";

export function PluginSlot<K extends keyof SurgeSlots>({
  name,
  props,
}: {
  name: K;
  props?: SurgeSlots[K];
}) {
  const registry = getSharedRegistry();
  return registry?.renderSlot(name, props ?? ({} as SurgeSlots[K])) ?? null;
}
