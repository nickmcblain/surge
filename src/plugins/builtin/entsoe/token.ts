import type { PluginConfigState } from "../../../types/plugin";

/** Plugin-config key the token lives under; shared by every energy module. */
export const ENTSOE_TOKEN_KEY = "entsoeToken";
export const ENTSOE_TOKEN_ENV = "SURGE_ENTSOE_TOKEN";

let configState: PluginConfigState | null = null;

export function attachEntsoeTokenSource(state: PluginConfigState | null): void {
  configState = state;
}

/** Config wins over the environment so a UI change takes effect without a restart. */
export function getEntsoeToken(): string | null {
  const configured = configState?.get<string>(ENTSOE_TOKEN_KEY)?.trim();
  if (configured) return configured;
  const env = typeof process !== "undefined" ? process.env?.[ENTSOE_TOKEN_ENV]?.trim() : undefined;
  return env || null;
}

export function hasEntsoeToken(): boolean {
  return getEntsoeToken() !== null;
}
