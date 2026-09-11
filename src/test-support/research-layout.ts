import {
  cloneLayout,
  createDefaultConfig,
  TICKER_RESEARCH_PANE_ID,
  type AppConfig,
  type LayoutConfig,
} from "../types/config";

/**
 * A source pane driving a following research pane. Tests of bindings, focus,
 * and layout mutations exercise this shape; the shipped default layout no
 * longer contains it, so they build it explicitly.
 */
export const RESEARCH_TEST_LAYOUT: LayoutConfig = {
  dockRoot: {
    kind: "split",
    axis: "horizontal",
    ratio: 0.34,
    first: { kind: "pane", instanceId: "portfolio-list:main" },
    second: { kind: "pane", instanceId: "ticker-detail:main" },
  },
  instances: [
    {
      instanceId: "portfolio-list:main",
      paneId: "portfolio-list",
      params: { collectionId: "main" },
      binding: { kind: "none" },
    },
    {
      instanceId: "ticker-detail:main",
      paneId: TICKER_RESEARCH_PANE_ID,
      settings: { hideTabs: false, lockedTabId: "overview" },
      binding: { kind: "follow", sourceInstanceId: "portfolio-list:main" },
    },
  ],
  floating: [],
  detached: [],
};

export function createResearchTestConfig(dataDir: string): AppConfig {
  const config = createDefaultConfig(dataDir);
  const layout = cloneLayout(RESEARCH_TEST_LAYOUT);
  return {
    ...config,
    layout,
    layouts: [{ name: "Home", layout: cloneLayout(layout), paneState: {} }],
    activeLayoutIndex: 0,
  };
}
