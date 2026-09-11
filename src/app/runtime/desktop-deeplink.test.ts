import { describe, expect, test } from "bun:test";
import { handleDesktopDeepLink, resolveDesktopDeepLinkAction } from "./desktop-deeplink";
import type { PluginRegistry } from "../../plugins/registry";
import type { AppState } from "../../state/app/context";

describe("desktop deeplinks", () => {
  test("opens a valid ticker on overview when a requested tab is unavailable, preserving registered tabs and rejected links", () => {
    const pinned: Array<{ symbol: string; options: unknown }> = [];
    const notices: Array<{ body: string; type: string }> = [];
    const panes = new Map([["ticker-research", {}]]);
    const registry = {
      panes,
      getTickerResearchTabPluginId: (id: string) => ["overview", "corporate-actions"].includes(id) ? "research" : undefined,
      pinTicker: (symbol: string, options: unknown) => { pinned.push({ symbol, options }); },
      notify: (notice: { body: string; type: string }) => { notices.push(notice); },
    } as unknown as PluginRegistry;
    const options = { pluginRegistry: registry, dispatch: () => {}, stateRef: { current: {} as AppState } };

    handleDesktopDeepLink("surge://ticker/RIVN?tab=events", options);
    expect(pinned).toEqual([{ symbol: "RIVN", options: { floating: true, paneType: "ticker-research", tabId: "overview" } }]);
    expect(notices.at(-1)).toEqual({ body: 'Ticker tab "events" is unavailable. Opening RIVN overview.', type: "info" });

    handleDesktopDeepLink("surge://ticker/RIVN?tab=corporate-actions", options);
    expect(pinned.at(-1)?.options).toMatchObject({ tabId: "corporate-actions" });
    handleDesktopDeepLink("surge://ticker?tab=events", options);
    expect(pinned).toHaveLength(2);
    expect(notices.at(-1)?.type).toBe("error");
    panes.clear();
    handleDesktopDeepLink("surge://ticker/RIVN?tab=events", options);
    expect(pinned).toHaveLength(2);
    expect(notices.at(-1)?.body).toBe("Ticker research is unavailable.");
  });

  test("ignores the website's analytics handoff parameters", () => {
    const handoff =
      "_surge=0f1e2d3c-4b5a-4968-8776-655443322110&utm_source=x&twclid=click_1&first_touch_at=2026-09-10T11:00:00.000Z&first_touch_referrer=https%3A%2F%2Ft.co%2Fabc";
    expect(resolveDesktopDeepLinkAction(`surge://ticker/NVDA?tab=chart&${handoff}`)).toEqual(
      resolveDesktopDeepLinkAction("surge://ticker/NVDA?tab=chart"),
    );
  });

  test("routes ticker links with arbitrary registered tab ids", () => {
    expect(resolveDesktopDeepLinkAction("surge://ticker/NVDA?tab=analyst-research")).toEqual({
      type: "open-ticker",
      symbol: "NVDA",
      tabId: "analyst-research",
      message: "Opened NVDA analyst-research tab.",
    });
  });

  test("routes alert links with structured values", () => {
    expect(resolveDesktopDeepLinkAction("surge://alert/new?symbol=nvda&side=above&price=$200")).toEqual({
      type: "create-alert",
      values: { symbol: "NVDA", condition: "above", price: "200" },
      message: "Created NVDA above 200 alert.",
    });
  });

  test("routes news links", () => {
    expect(resolveDesktopDeepLinkAction("surge://news?ticker=7203.T")).toEqual({
      type: "open-news",
      kind: "ticker",
      symbol: "7203.T",
      message: "Opened 7203.T news.",
    });
    expect(resolveDesktopDeepLinkAction("surge://news/breaking")).toEqual({
      type: "open-news",
      kind: "breaking",
      symbol: null,
      message: "Opened breaking news.",
    });
  });

  test("rejects command-bar, non-surge, and malformed links", () => {
    expect(resolveDesktopDeepLinkAction("surge://command?query=profile").type).toBe("unsupported");
    expect(resolveDesktopDeepLinkAction("surge://search/NVDA").type).toBe("unsupported");
    expect(resolveDesktopDeepLinkAction("https://gloom.sh/cloud").type).toBe("unsupported");
    expect(resolveDesktopDeepLinkAction("surge://cloud/success").type).toBe("unsupported");
    expect(resolveDesktopDeepLinkAction("surge://chat/channel/everyone").type).toBe("unsupported");
    expect(resolveDesktopDeepLinkAction("not a url").type).toBe("unsupported");
  });
});
