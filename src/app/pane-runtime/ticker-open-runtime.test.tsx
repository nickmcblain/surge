import { getDockedPaneIds } from "../../plugins/pane-manager";
import { expect, test } from "bun:test";
import { act } from "react";
import { testRender } from "../../renderers/opentui/test-utils";
import { createTestDataProvider } from "../../test-support/data-provider";
import { createInitialState, type AppAction } from "../../state/app/context";
import { createDefaultConfig, createPaneInstance, TICKER_RESEARCH_PANE_ID } from "../../types/config";
import type { TickerRecord } from "../../types/ticker";
import { useAppTickerOpenRuntime } from "./ticker-open-runtime";

test("ambiguous deep links open the listing picker without publishing an arbitrary ticker", async () => {
  const actions: AppAction[] = [];
  const notifications: string[] = [];
  const stateRef = { current: createInitialState(createDefaultConfig(":memory:")) };
  let runtime!: ReturnType<typeof useAppTickerOpenRuntime>;
  function Harness() {
    runtime = useAppTickerOpenRuntime({
      stateRef,
      dataProvider: createTestDataProvider({
        search: async () => ["BYMA", "NYSE"].map((exchange) => ({ providerId: "cloud", symbol: "GLD", name: "SPDR", exchange, type: "ETF" })),
        getQuote: async () => ({ symbol: "GLD", price: 400, currency: "USD", lastUpdated: 1, change: 0, changePercent: 0 }),
      }),
      tickerRepository: { createTicker: async () => { throw new Error("Must not create an ambiguous ticker"); } } as any,
      dispatch: (action) => { actions.push(action); },
      pluginRegistry: { notify: ({ body }: { body: string }) => { notifications.push(body); } } as any,
      buildPaneInstance: () => null, persistLayout() {}, activatePane() {}, focusVisiblePane() {},
    });
    return <text>Research</text>;
  }
  const rendered = await testRender(<Harness />, { width: 20, height: 2 });
  try {
    await act(async () => { await rendered.renderOnce(); await runtime.openPinnedTicker("GLD"); });
    expect(actions).toEqual([{ type: "SET_COMMAND_BAR", open: true, query: "GLD", launch: { kind: "ticker-search", query: "GLD" } }]);
    expect(notifications[0]).toContain("Multiple listings match GLD");
  } finally {
    await act(async () => { rendered.renderer.destroy(); });
  }
});

test.each(["floating", "docked", "only-floating"])("ticker research opens visibly from a %s source", async (mode) => {
  const source = createPaneInstance("relative-valuation", { instanceId: "relative-valuation:source", binding: { kind: "none" } });
  const anchor = createPaneInstance("world-indices", { instanceId: "world-indices:anchor", binding: { kind: "none" } });
  const config = createDefaultConfig(":memory:");
  config.layout = { dockRoot: mode === "only-floating" ? null : { kind: "pane", instanceId: mode === "docked" ? source.instanceId : anchor.instanceId },
    instances: mode === "only-floating" || mode === "docked" ? [source] : [source, anchor],
    floating: mode === "docked" ? [] : [{ instanceId: source.instanceId, x: 2, y: 2, width: 80, height: 20, zIndex: 1 }], detached: [] };
  const stateRef = { current: createInitialState(config) };
  stateRef.current.focusedPaneId = source.instanceId;
  const ticker: TickerRecord = { metadata: { ticker: "RIVN:XNAS", exchange: "NASDAQ", currency: "USD", name: "Rivian",
    portfolios: [], watchlists: [], positions: [], custom: {}, tags: [] } };
  let runtime!: ReturnType<typeof useAppTickerOpenRuntime>;
  const activated: string[] = [];
  function Harness() {
    runtime = useAppTickerOpenRuntime({ stateRef, dataProvider: createTestDataProvider(), tickerRepository: {} as any, dispatch() {},
      pluginRegistry: { panes: new Map([[TICKER_RESEARCH_PANE_ID, { id: TICKER_RESEARCH_PANE_ID }]]), events: { emit() {} },
        getTermSizeFn: () => ({ width: 120, height: 40 }) } as any,
      buildPaneInstance: (paneId, options) => createPaneInstance(paneId, { ...options, instanceId: "ticker-detail:opened" }),
      persistLayout: (layout) => { stateRef.current.config.layout = layout; },
      activatePane: (paneId) => { activated.push(paneId); }, focusVisiblePane() {},
    });
    return <text>Research</text>;
  }
  const rendered = await testRender(<Harness />, { width: 20, height: 2 });
  try {
    await act(async () => { await rendered.renderOnce(); runtime.placePinnedTickerTarget({ symbol: "RIVN:XNAS", ticker, created: false }, { floating: false }); });
    const layout = stateRef.current.config.layout;
    expect(getDockedPaneIds(layout)).toContain("ticker-detail:opened");
    expect(layout.instances.find((pane) => pane.instanceId === "ticker-detail:opened")?.binding).toEqual({ kind: "fixed", symbol: "RIVN:XNAS" });
    expect(activated).toEqual(["ticker-detail:opened"]);
    if (mode !== "docked") expect(layout.floating.map((pane) => pane.instanceId)).toContain(source.instanceId);
    else expect(getDockedPaneIds(layout)).toContain(source.instanceId);
  } finally {
    await act(async () => { rendered.renderer.destroy(); });
  }
});
