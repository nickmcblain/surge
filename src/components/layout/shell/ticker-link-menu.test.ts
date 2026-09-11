import { describe, expect, test } from "bun:test";
import { createInitialState } from "../../../state/app/context";
import {
  createDefaultConfig,
  createPaneInstance,
  findPaneInstance,
  TICKER_RESEARCH_PANE_ID,
  type LayoutConfig,
} from "../../../types/config";
import type { PaneDef } from "../../../types/plugin";
import { getPaneDisplayTitle } from "../pane/title";
import { tickerLinkMenuItems } from "./ticker-link-menu";

const panes = new Map<string, PaneDef>([
  ["futures", {
    id: "futures",
    name: "Futures",
    component: () => null,
    defaultPosition: "left",
    tickerSource: true,
  }],
  [TICKER_RESEARCH_PANE_ID, {
    id: TICKER_RESEARCH_PANE_ID,
    name: "Ticker Research",
    component: () => null,
    defaultPosition: "right",
  }],
]);

describe("tickerLinkMenuItems", () => {
  test("pins the current ticker when unlinking and can link back to the source", () => {
    const source = createPaneInstance("futures", { instanceId: "futures:main", binding: { kind: "none" } });
    const follower = createPaneInstance(TICKER_RESEARCH_PANE_ID, {
      instanceId: "ticker-detail:main",
      binding: { kind: "follow", sourceInstanceId: "futures:main" },
    });
    const config = createDefaultConfig("/tmp/gloomberb-link-menu-test");
    config.layout = {
      dockRoot: {
        kind: "split",
        axis: "horizontal",
        ratio: 0.5,
        first: { kind: "pane", instanceId: source.instanceId },
        second: { kind: "pane", instanceId: follower.instanceId },
      },
      instances: [source, follower],
      floating: [],
      detached: [],
    };
    const state = createInitialState(config);
    state.paneState["futures:main"] = { cursorSymbol: "AAPL" };
    const target = findPaneInstance(state.config.layout, "ticker-detail:main")!;
    let layout: LayoutConfig = state.config.layout;

    expect(getPaneDisplayTitle(state, target, panes.get(TICKER_RESEARCH_PANE_ID)!, panes)).toBe(
      "AAPL  ⧉ Linked to Futures",
    );

    tickerLinkMenuItems({
      instance: target,
      layout,
      panes,
      state,
      persistLayout: (nextLayout) => { layout = nextLayout; },
    }).find((item) => item.id === "unlink:futures:main")?.onSelect?.();

    const pinned = findPaneInstance(layout, target.instanceId)!;
    expect(pinned.binding).toEqual({ kind: "fixed", symbol: "AAPL" });

    const previousFollower = createPaneInstance(TICKER_RESEARCH_PANE_ID, {
      instanceId: "ticker-detail:previous",
      binding: { kind: "follow", sourceInstanceId: "futures:main" },
    });
    layout = {
      ...layout,
      instances: [...layout.instances, previousFollower],
      floating: [
        ...layout.floating,
        { instanceId: previousFollower.instanceId, x: 1, y: 1, width: 40, height: 12 },
      ],
    };
    const pinnedState = { ...state, config: { ...state.config, layout } };
    tickerLinkMenuItems({
      instance: pinned,
      layout,
      panes,
      state: pinnedState,
      persistLayout: (nextLayout) => { layout = nextLayout; },
    }).find((item) => item.id === "link:futures:main")?.onSelect?.();

    expect(findPaneInstance(layout, target.instanceId)?.binding).toEqual({
      kind: "follow",
      sourceInstanceId: "futures:main",
    });
    expect(findPaneInstance(layout, previousFollower.instanceId)?.binding).toEqual({
      kind: "fixed",
      symbol: "AAPL",
    });
  });
});
