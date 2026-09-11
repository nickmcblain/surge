import { describe, expect, test } from "bun:test";
import { cloneLayout, createDefaultConfig, createPaneInstance, type LayoutConfig } from "./types/config";
import { createResearchTestConfig } from "./test-support/research-layout";
import { deletePaneSetting, getPaneSettingValue, setPaneSetting } from "./pane-settings";

describe("pane settings helpers", () => {
  test("cloneLayout deep-clones pane settings", () => {
    const layout = cloneLayout(createResearchTestConfig("/tmp/surge-pane-settings").layout);
    const cloned = cloneLayout(layout);
    const clonedSettings = cloned.instances.find((instance) => instance.instanceId === "ticker-detail:main")?.settings;
    const originalSettings = layout.instances.find((instance) => instance.instanceId === "ticker-detail:main")?.settings;

    expect(clonedSettings).toBeDefined();
    expect(clonedSettings).not.toBe(originalSettings);

    if (clonedSettings) clonedSettings.lockedTabId = "chart";
    expect(originalSettings?.lockedTabId).toBe("overview");
  });

  test("setPaneSetting and deletePaneSetting update pane-scoped settings immutably", () => {
    const config = createResearchTestConfig("/tmp/surge-pane-settings");
    const extraPane = createPaneInstance("quote-monitor", {
      instanceId: "quote-monitor:test",
      binding: { kind: "fixed", symbol: "AAPL" },
      settings: { symbol: "AAPL" },
    });
    const layout: LayoutConfig = {
      ...config.layout,
      instances: [...config.layout.instances, extraPane],
    };

    const updated = setPaneSetting(layout, "quote-monitor:test", "symbol", "MSFT");
    expect(getPaneSettingValue(updated.instances.find((instance) => instance.instanceId === "quote-monitor:test"), "symbol", "")).toBe("MSFT");
    expect(getPaneSettingValue(layout.instances.find((instance) => instance.instanceId === "quote-monitor:test"), "symbol", "")).toBe("AAPL");

    const cleared = deletePaneSetting(updated, "quote-monitor:test", "symbol");
    expect(getPaneSettingValue(cleared.instances.find((instance) => instance.instanceId === "quote-monitor:test"), "symbol", null)).toBeNull();
  });
});
