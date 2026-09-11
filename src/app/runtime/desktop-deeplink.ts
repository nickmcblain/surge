import { useEffect, type Dispatch } from "react";
import type { PluginRegistry } from "../../plugins/registry";
import type { AppAction, AppState } from "../../state/app/context";
import { TICKER_RESEARCH_PANE_ID } from "../../types/config";
import type { DesktopDeepLinkBridge } from "../../types/desktop-deeplink";
import type { DesktopWindowBridge } from "../../types/desktop-window";
type AlertDeepLinkCondition = "above" | "below" | "crosses";
type NewsDeepLinkKind = "breaking" | "feed" | "ticker" | "top";

export type DesktopDeepLinkAction =
  | { type: "open-ticker"; symbol: string; tabId: string | null; message: string }
  | {
      type: "create-alert";
      values: { symbol: string; condition: AlertDeepLinkCondition; price: string };
      message: string;
    }
  | { type: "open-news"; kind: NewsDeepLinkKind; symbol: string | null; message: string }
  | { type: "unsupported"; message: string };

interface ParsedSurgeUrl {
  url: URL;
  host: string;
  segments: string[];
}

interface DesktopDeepLinkHandlerOptions {
  dispatch: Dispatch<AppAction>;
  pluginRegistry: PluginRegistry;
  stateRef: { current: AppState };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function splitPathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((segment) => safeDecode(segment).trim())
    .filter(Boolean);
}

function parseSurgeUrl(rawUrl: string): ParsedSurgeUrl | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "surge:") return null;

  const host = url.hostname.trim().toLowerCase();
  if (host) {
    return { url, host, segments: splitPathSegments(url.pathname) };
  }

  const segments = splitPathSegments(url.pathname);
  const opaqueHost = segments.shift()?.toLowerCase();
  return opaqueHost ? { url, host: opaqueHost, segments } : null;
}

function param(url: URL, ...names: string[]): string | null {
  for (const name of names) {
    const value = url.searchParams.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

function normalizeSymbol(value: string | null | undefined): string | null {
  const trimmed = value?.trim().replace(/^\$/, "");
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

function normalizeAlertCondition(value: string | null): AlertDeepLinkCondition | null {
  switch (value?.trim().toLowerCase()) {
    case ">":
    case "above":
    case "over":
    case "gt":
      return "above";
    case "<":
    case "below":
    case "under":
    case "lt":
      return "below";
    case "x":
    case "cross":
    case "crosses":
      return "crosses";
    default:
      return null;
  }
}

function normalizePrice(value: string | null): string | null {
  const trimmed = value?.trim().replace(/^\$/, "");
  if (!trimmed) return null;
  const price = Number.parseFloat(trimmed);
  return Number.isFinite(price) && price > 0 ? String(price) : null;
}

function tickerMessage(symbol: string, tabId: string | null): string {
  return tabId ? `Opened ${symbol} ${tabId} tab.` : `Opened ${symbol}.`;
}

function parseTickerDeepLink(parsed: ParsedSurgeUrl): DesktopDeepLinkAction {
  const symbol = normalizeSymbol(parsed.segments[0] ?? param(parsed.url, "symbol", "ticker"));
  if (!symbol) return { type: "unsupported", message: "Ticker links need a symbol." };
  const tabId = param(parsed.url, "tab");
  return { type: "open-ticker", symbol, tabId, message: tickerMessage(symbol, tabId) };
}

function parseAlertDeepLink(parsed: ParsedSurgeUrl): DesktopDeepLinkAction {
  if ((parsed.segments[0] ?? "new") !== "new") {
    return { type: "unsupported", message: "Unsupported Surge alert link." };
  }
  const symbol = normalizeSymbol(param(parsed.url, "symbol", "ticker"));
  const condition = normalizeAlertCondition(param(parsed.url, "condition", "side", "trigger"));
  const price = normalizePrice(param(parsed.url, "price", "target"));
  if (!symbol || !condition || !price) {
    return { type: "unsupported", message: "Alert links need symbol, condition, and price." };
  }
  return {
    type: "create-alert",
    values: { symbol, condition, price },
    message: `Created ${symbol} ${condition} ${price} alert.`,
  };
}

function parseNewsDeepLink(parsed: ParsedSurgeUrl): DesktopDeepLinkAction {
  const ticker = normalizeSymbol(param(parsed.url, "ticker", "symbol") ?? (parsed.segments[0] === "ticker" ? parsed.segments[1] : null));
  if (ticker) return { type: "open-news", kind: "ticker", symbol: ticker, message: `Opened ${ticker} news.` };

  const route = parsed.segments[0] ?? "top";
  if (route === "breaking") {
    return { type: "open-news", kind: "breaking", symbol: null, message: "Opened breaking news." };
  }
  if (route === "feed") {
    return { type: "open-news", kind: "feed", symbol: null, message: "Opened news feed." };
  }
  if (route === "top") {
    return { type: "open-news", kind: "top", symbol: null, message: "Opened top news." };
  }
  return { type: "unsupported", message: "Unsupported Surge news link." };
}

export function resolveDesktopDeepLinkAction(rawUrl: string): DesktopDeepLinkAction {
  const parsed = parseSurgeUrl(rawUrl);
  if (!parsed) return { type: "unsupported", message: "Unsupported Surge link." };

  switch (parsed.host) {
    case "ticker":
      return parseTickerDeepLink(parsed);
    case "alert":
      return parseAlertDeepLink(parsed);
    case "news":
      return parseNewsDeepLink(parsed);
    default:
      return { type: "unsupported", message: "Unsupported Surge link." };
  }
}

function notifyError(pluginRegistry: PluginRegistry, body: string): void {
  pluginRegistry.notify({ body, type: "error" });
}

function notifySuccess(pluginRegistry: PluginRegistry, body: string): void {
  pluginRegistry.notify({ body, type: "success" });
}

function requirePane(pluginRegistry: PluginRegistry, paneId: string, unavailableMessage: string): boolean {
  if (pluginRegistry.panes.has(paneId)) return true;
  notifyError(pluginRegistry, unavailableMessage);
  return false;
}

function handleOpenTicker(
  action: Extract<DesktopDeepLinkAction, { type: "open-ticker" }>,
  pluginRegistry: PluginRegistry,
): void {
  if (!requirePane(pluginRegistry, TICKER_RESEARCH_PANE_ID, "Ticker research is unavailable.")) return;
  const unavailableTab = action.tabId && !pluginRegistry.getTickerResearchTabPluginId(action.tabId);
  const tabId = unavailableTab ? "overview" : action.tabId;

  pluginRegistry.pinTicker(action.symbol, {
    floating: true,
    paneType: TICKER_RESEARCH_PANE_ID,
    tabId: tabId ?? undefined,
  });
  if (unavailableTab) {
    pluginRegistry.notify({ body: `Ticker tab "${action.tabId}" is unavailable. Opening ${action.symbol} overview.`, type: "info" });
  } else {
    notifySuccess(pluginRegistry, action.message);
  }
}

function handleCreateAlert(
  action: Extract<DesktopDeepLinkAction, { type: "create-alert" }>,
  pluginRegistry: PluginRegistry,
): void {
  const command = pluginRegistry.commands.get("set-alert");
  if (!command) {
    notifyError(pluginRegistry, "Alerts are unavailable.");
    return;
  }
  void Promise.resolve(command.execute(action.values)).catch((error) => {
    notifyError(pluginRegistry, error instanceof Error ? error.message : "Failed to create alert.");
  });
}

function handleOpenNews(
  action: Extract<DesktopDeepLinkAction, { type: "open-news" }>,
  pluginRegistry: PluginRegistry,
): void {
  if (action.kind === "ticker") {
    if (!action.symbol || !pluginRegistry.paneTemplates.has("ticker-news-pane")) {
      notifyError(pluginRegistry, "Ticker news is unavailable.");
      return;
    }
    void pluginRegistry.createPaneFromTemplateAsyncFn("ticker-news-pane", { symbol: action.symbol }).then(() => {
      notifySuccess(pluginRegistry, action.message);
    }).catch((error) => {
      notifyError(pluginRegistry, error instanceof Error ? error.message : "Failed to open ticker news.");
    });
    return;
  }

  const paneId = action.kind === "breaking"
    ? "news-breaking"
    : action.kind === "feed"
      ? "news-feed"
      : "news-top";
  if (!requirePane(pluginRegistry, paneId, "News is unavailable.")) return;
  pluginRegistry.showPane(paneId);
  notifySuccess(pluginRegistry, action.message);
}

export function handleDesktopDeepLink(rawUrl: string, options: DesktopDeepLinkHandlerOptions): void {
  const action = resolveDesktopDeepLinkAction(rawUrl);
  if (action.type === "unsupported") {
    notifyError(options.pluginRegistry, action.message);
    return;
  }

  switch (action.type) {
    case "open-ticker":
      handleOpenTicker(action, options.pluginRegistry);
      return;
    case "create-alert":
      handleCreateAlert(action, options.pluginRegistry);
      return;
    case "open-news":
      handleOpenNews(action, options.pluginRegistry);
      return;
  }
}

export function useDesktopDeepLinkRuntime({
  desktopDeepLinkBridge,
  desktopWindowKind,
  dispatch,
  initialized,
  pluginRegistry,
  stateRef,
}: {
  desktopDeepLinkBridge?: DesktopDeepLinkBridge;
  desktopWindowKind?: DesktopWindowBridge["kind"];
  dispatch: Dispatch<AppAction>;
  initialized: boolean;
  pluginRegistry: PluginRegistry;
  stateRef: { current: AppState };
}) {
  useEffect(() => {
    if (!initialized || desktopWindowKind === "detached" || !desktopDeepLinkBridge) return;
    return desktopDeepLinkBridge.subscribe((deeplink) => {
      handleDesktopDeepLink(deeplink.url, { dispatch, pluginRegistry, stateRef });
    });
  }, [desktopDeepLinkBridge, desktopWindowKind, dispatch, initialized, pluginRegistry, stateRef]);
}
