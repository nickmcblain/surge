import { describe, expect, test } from "bun:test";
import { getDesktopBackendPlugins } from "./catalog-backend";
import { getLoadablePlugins } from "./catalog";

describe("desktop backend plugin catalog", () => {
  test("keeps plugin identity and order aligned with the CLI catalog", () => {
    const backendPlugins = getDesktopBackendPlugins();

    expect(backendPlugins.map((plugin) => plugin.id)).toEqual(
      getLoadablePlugins().map((plugin) => plugin.id),
    );
  });

  test("includes compatible external plugins in the native desktop backend", () => {
    const externalPlugin = {
      id: "external-broker",
      name: "External broker",
      version: "1.0.0",
      targets: ["cli", "tui", "desktop"] as const,
    };
    const backendPlugins = getDesktopBackendPlugins([
      { plugin: externalPlugin, path: "/plugins/external-broker" },
      {
        plugin: { id: "broken", name: "Broken", version: "1.0.0" },
        path: "/plugins/broken",
        error: "load failed",
      },
      {
        plugin: { id: "web-only", name: "Web only", version: "1.0.0" },
        path: "/plugins/web-only",
        unsupportedTarget: "desktop",
      },
    ]);

    expect(backendPlugins).toContain(externalPlugin);
    expect(backendPlugins.some((plugin) => plugin.id === "broken")).toBe(false);
    expect(backendPlugins.some((plugin) => plugin.id === "web-only")).toBe(false);
  });
});
