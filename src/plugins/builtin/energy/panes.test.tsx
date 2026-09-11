import { afterEach, expect, test } from "bun:test";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { App } from "../../../app";
import { createAppServices } from "../../../core/app-services";
import { setConfigStoreHost } from "../../../data/config/store";
import * as nodeConfigStoreHost from "../../../data/config/store/node";
import { settleFrame, testRender } from "../../../renderers/opentui/test-utils";
import { createDefaultConfig } from "../../../types/config";
import type { EnergyPoint } from "../../../types/energy";
import { getLoadablePlugins } from "../../catalog";
import type { EntsoeClient, EntsoeWindow } from "../entsoe/client";
import { setEntsoeClient } from "../entsoe/data";

// Boots the real Home layout against a synthetic ENTSO-E client. The panes only
// exercise their data paths (charts, stats headers, board rows) once a bundle
// arrives, which no other test reaches without a live token.

function hourly(window: EntsoeWindow, fn: (hour: number) => number): EnergyPoint[] {
  const points: EnergyPoint[] = [];
  for (let ts = window.startMs; ts < window.endMs; ts += 3_600_000) {
    points.push({ ts, value: fn(new Date(ts).getUTCHours()) });
  }
  return points;
}

const fakeClient: EntsoeClient = {
  async dayAheadPrices(zone, window) {
    return { zone: zone.code, unit: "EUR/MWh", currency: "EUR", resolution: "PT60M", points: hourly(window, (h) => 60 + 40 * Math.sin((h / 24) * Math.PI * 2)) };
  },
  async load(zone, window, kind) {
    return { zone: zone.code, unit: "MW", resolution: "PT60M", kind, points: hourly(window, (h) => 45_000 + 10_000 * Math.sin((h / 24) * Math.PI * 2)) };
  },
  async generationPerType(zone, window) {
    return { zone: zone.code, unit: "MW", resolution: "PT60M", byType: { B19: hourly(window, () => 12_000), B04: hourly(window, () => 9_000) } };
  },
  async windSolarForecast(zone, window) {
    return { zone: zone.code, unit: "MW", resolution: "PT60M", byType: { B19: hourly(window, () => 11_000) } };
  },
  async physicalFlow(from, to, window) {
    return { zone: from.code, from: from.code, to: to.code, unit: "MW", resolution: "PT60M", points: hourly(window, () => 1_500) };
  },
};

let setup: Awaited<ReturnType<typeof testRender>> | undefined;
const originalToken = process.env.SURGE_ENTSOE_TOKEN;
const originalError = console.error;

afterEach(() => {
  setup?.renderer.destroy();
  setup = undefined;
  setEntsoeClient(null);
  console.error = originalError;
  if (originalToken === undefined) delete process.env.SURGE_ENTSOE_TOKEN;
  else process.env.SURGE_ENTSOE_TOKEN = originalToken;
});

test("home layout renders every energy pane with data and settles", async () => {
  const reactErrors: string[] = [];
  console.error = (...args: unknown[]) => { reactErrors.push(String(args[0])); };
  process.env.SURGE_ENTSOE_TOKEN = "test-token";
  setConfigStoreHost(nodeConfigStoreHost);
  setEntsoeClient(fakeClient);

  const config = { ...createDefaultConfig(mkdtempSync(join(tmpdir(), "surge-energy-"))), onboardingComplete: true };
  setup = await testRender(
    <App config={config} servicesFactory={createAppServices} plugins={getLoadablePlugins()} updatesEnabled={false} />,
    { width: 220, height: 56 },
  );
  for (let i = 0; i < 10; i += 1) await settleFrame(setup, 100);

  const frame = setup.captureCharFrame();
  expect(reactErrors.filter((message) => message.includes("Maximum update depth"))).toEqual([]);
  expect(frame).not.toContain("TextNodeRenderable");
  expect(frame).not.toContain("token not configured");
  expect(frame).toContain("EUR/MWh");
  expect(frame).toContain("GENERATION STACK");
  expect(frame).toContain("Wind Onshore");
});
