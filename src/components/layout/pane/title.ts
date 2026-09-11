import { resolveCollectionForPane, resolveTickerForPane, type AppState } from "../../../state/app/context";
import { t, tf } from "../../../i18n";
import {
  findPaneInstance,
  TICKER_RESEARCH_PANE_ID,
  type PaneInstanceConfig,
} from "../../../types/config";
import type { PaneDef } from "../../../types/plugin";

/** Single-cell link glyph: emoji link icons render double-width in terminals. */
const LINK_GLYPH = "\u29c9";

function getBasePaneDisplayTitle(
  state: Pick<AppState, "config" | "paneState">,
  instance: PaneInstanceConfig,
  paneDef: PaneDef,
): string {
  if (instance.paneId === TICKER_RESEARCH_PANE_ID) {
    const ticker = resolveTickerForPane(state as AppState, instance.instanceId);
    if (ticker) return ticker;
    const collectionId = resolveCollectionForPane(state as AppState, instance.instanceId);
    return state.config.portfolios.find((portfolio) => portfolio.id === collectionId)?.name
      ?? state.config.watchlists.find((watchlist) => watchlist.id === collectionId)?.name
      ?? instance.title
      ?? t(paneDef.name);
  }

  if (instance.title) return instance.title;

  // A source pane owns the cursor symbol; echoing it in its own title would just repeat the row.
  if (paneDef.tickerSource) return t(paneDef.name);

  const ticker = resolveTickerForPane(state as AppState, instance.instanceId);
  return ticker ? `${t(paneDef.name)}: ${ticker}` : t(paneDef.name);
}

export function getPaneDisplayTitle(
  state: Pick<AppState, "config" | "paneState">,
  instance: PaneInstanceConfig,
  paneDef: PaneDef,
  panes?: ReadonlyMap<string, PaneDef>,
): string {
  const title = getBasePaneDisplayTitle(state, instance, paneDef);
  if (instance.paneId !== TICKER_RESEARCH_PANE_ID || instance.binding?.kind !== "follow" || !panes) {
    return title;
  }

  const source = findPaneInstance(state.config.layout, instance.binding.sourceInstanceId);
  const sourceDef = source ? panes.get(source.paneId) : null;
  if (!source || !sourceDef) return title;
  const sourceTitle = getBasePaneDisplayTitle(state, source, sourceDef);
  return `${title}  ${LINK_GLYPH} ${tf("Linked to {source}", { source: sourceTitle })}`;
}
