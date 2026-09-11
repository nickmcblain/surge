import { useEffect, type Dispatch } from "react";
import type { AppSessionSnapshot } from "../../core/state/session-persistence";
import type { AppTickerRepositoryPort } from "../../core/app-service-ports";
import type { MarketDataCoordinator } from "../../market-data/coordinator";
import { instrumentFromTicker } from "../../market-data/request-types";
import type { PluginRegistry } from "../../plugins/registry";
import type {
  AppAction,
  AppState,
} from "../../state/app/context";
import {
  initializeAppState,
  type InitializeAppStateArgs,
} from "../../state/app/bootstrap";
import type { DataProvider } from "../../types/data-provider";
import { debugLog } from "../../utils/debug-log";
import { measurePerfAsync } from "../../utils/perf-marks";

const appLog = debugLog.createLogger("app");

interface UseAppStartupRuntimeOptions {
  appActive: boolean;
  dataProvider: DataProvider;
  dispatch: Dispatch<AppAction>;
  focusedTickerSymbol: string | null;
  marketData: MarketDataCoordinator;
  pluginRegistry: PluginRegistry;
  primeCachedFinancials: InitializeAppStateArgs["primeCachedFinancials"];
  refreshQuote: InitializeAppStateArgs["refreshQuote"];
  refreshQuotesBatch: InitializeAppStateArgs["refreshQuotesBatch"];
  refreshTicker: InitializeAppStateArgs["refreshTicker"];
  refreshTickersBatch: InitializeAppStateArgs["refreshTickersBatch"];
  sessionSnapshot?: AppSessionSnapshot | null;
  state: AppState;
  tickerRepository: AppTickerRepositoryPort;
}

export function useAppStartupRuntime({
  appActive,
  dataProvider,
  dispatch,
  focusedTickerSymbol,
  marketData,
  pluginRegistry,
  primeCachedFinancials,
  refreshQuote,
  refreshQuotesBatch,
  refreshTicker,
  refreshTickersBatch,
  sessionSnapshot,
  state,
  tickerRepository,
}: UseAppStartupRuntimeOptions): void {
  useEffect(() => {
    appLog.info("app activity propagated", { active: appActive });
  }, [appActive]);

  useEffect(() => {
    if (state.initialized || (globalThis as any).__surgeInitStarted) return;
    (globalThis as any).__surgeInitStarted = true;
    (async () => {
      try {
        await measurePerfAsync("startup.app.initialize-state", () => initializeAppState({
          config: state.config,
          tickerRepository,
          dataProvider,
          sessionSnapshot,
          dispatch,
          primeCachedFinancials,
          refreshTicker,
          refreshQuote,
          refreshTickersBatch,
          refreshQuotesBatch,
        }), {
          brokerInstanceCount: state.config.brokerInstances.length,
          layoutPaneCount: state.config.layout.instances.length,
          sessionHydrationTargetCount: sessionSnapshot?.hydrationTargets.length ?? 0,
        });
      } catch (err) {
        // Will show empty state.
      }
    })();
  }, [
    dataProvider,
    dispatch,
    primeCachedFinancials,
    refreshQuote,
    refreshQuotesBatch,
    refreshTicker,
    refreshTickersBatch,
    sessionSnapshot,
    state.config,
    state.initialized,
    tickerRepository,
  ]);

  useEffect(() => {
    if (!focusedTickerSymbol) return;
    const ticker = state.tickers.get(focusedTickerSymbol);
    if (!ticker) return;
    appLog.info("focused ticker prefetch scheduled", {
      symbol: ticker.metadata.ticker,
      exchange: ticker.metadata.exchange,
    });
    marketData.prefetchTicker(instrumentFromTicker(ticker, ticker.metadata.ticker));
  }, [focusedTickerSymbol, marketData, state.tickers]);
}
