import { useCallback, useEffect, useMemo, useRef } from "react";
import type { DataProvider } from "../../../types/data-provider";
import type { AppTickerRepositoryPort } from "../../../core/app-service-ports";
import type { PluginRegistry } from "../../../plugins/registry";
import type { LayoutBounds } from "../../../plugins/pane-manager";
import {
  getAvailableCommandBarSearchProviders,
  useCommandBarSearchProviders,
} from "../routes/root/search-providers";
import { openUrl } from "../../ui/external-link";
import { useRouteListState } from "../routing/list-state";
import { useCommandBarRootRuntime } from "../routes/root/runtime";
import { parseRootShortcutIntent } from "../routes/root/shortcuts";
import { useCommandBarThemePreview } from "../theme-preview";
import { CommandBarPanel } from "../panel";
import { useCommandBarNavigationState } from "../routing/navigation-state";
import { useCommandBarSelectionRuntime } from "../selection-runtime";
import { useCommandBarPanelRuntime } from "../panel/runtime";
import { useCommandBarRouteEffects } from "../routing/effects";
import { useCommandBarEnvironment } from "./environment";
import { useCommandBarActionRuntime } from "../action-runtime";

interface CommandBarProps {
  dataProvider: DataProvider;
  tickerRepository: AppTickerRepositoryPort;
  pluginRegistry: PluginRegistry;
  quitApp: () => void;
  onCheckForUpdates?: () => void | Promise<void>;
  onNativeOccluderChange?: (rect: LayoutBounds | null) => void;
}

export function CommandBar({
  dataProvider,
  tickerRepository,
  pluginRegistry,
  quitApp,
  onCheckForUpdates,
  onNativeOccluderChange,
}: CommandBarProps) {
  const {
    activeCollectionId,
    activeFinancials,
    activePortfolio,
    activeTickerData,
    activeTickerSymbol,
    availableCommands: allAvailableCommands,
    cellHeightPx,
    cellWidthPx,
    dispatch,
    getCommittedThemeId,
    nativeListScrollRef,
    nativePaneChrome,
    nativeWindowChrome,
    persistConfig,
    skipTickerSearchDebounceRef,
    state,
    stateRef,
    termHeight,
    termWidth,
    themePickerRef,
    titleBarOverlay,
    visibleListStateRef,
  } = useCommandBarEnvironment();
  const availableCommands = useMemo(() => onCheckForUpdates
    ? allAvailableCommands
    : allAvailableCommands.filter((command) => command.id !== "check-for-updates"), [allAvailableCommands, onCheckForUpdates]);
  const {
    applyThemePreview,
    clearThemePreview,
    commitTheme,
    restoreThemePreview,
    rootThemeBaseIdRef,
  } = useCommandBarThemePreview({
    dispatch,
    getCommittedThemeId,
    themePickerRef,
  });
  const {
    closeAll,
    currentRoute,
    currentRouteRef,
    dismissCommandBar,
    lastMainBrowseRef,
    markRootSelectionNavigated,
    popRoute,
    pushRoute,
    rootHoveredIdx,
    rootModeInfo,
    rootModeKindRef,
    rootQuery,
    rootQueryRef,
    rootSelectionNavigatedRef,
    rootSelectedIdx,
    setRootHoveredIdx,
    setRootQuery,
    setRootSelectedIdx,
    setRouteStack,
    updateTopRoute,
  } = useCommandBarNavigationState({
    availableCommands,
    dispatch,
    initialQuery: state.commandBarQuery,
    restoreThemePreview,
  });

  const {
    adaptTickerSearchRouteResult,
    buildLayoutItems,
    buildPaneSettingItems,
    buildTickerSearchResultItems,
    buildWindowModeItems,
    collectionWorkflowActions,
    confirmCurrentRoute,
    createPaneTemplateItem,
    createPluginCommandItem,
    executeCollectionCommand,
    getAvailablePaneShortcutTemplates,
    getAvailablePaneTemplates,
    getAvailablePluginCommands,
    ensureRouteFieldFocus,
    focusWorkflowField,
    getWorkflowFieldStringValue,
    getWorkflowInputRef,
    localTickerSearchResultItems,
    moveWorkflowFocus,
    nonShortcutPaneTemplateItems,
    openInlineConfirm,
    openModeRoute,
    openPaneTemplateWorkflow,
    openPluginCommandWorkflow,
    openWorkflowFieldPicker,
    paneShortcutItems,
    persistLayoutChange,
    pluginCommandItems,
    pluginCommandResultItems,
    readTickerSearchCache,
    runDirectCommand,
    runSecurityDescriptionShortcut,
    setWorkflowNativeSelectRef,
    submitWorkflowRoute,
    syncActiveWorkflowTextarea,
    tickerActionItems,
    updateWorkflowValue,
    workflowNativeSelectRefs,
    workflowScrollRef,
    writeTickerSearchCache,
  } = useCommandBarActionRuntime({
    activeCollectionId,
    activeFinancials,
    activeTickerData,
    activeTickerSymbol,
    closeAll,
    config: state.config,
    currentRoute,
    dataProvider,
    dispatch,
    focusedPaneId: state.focusedPaneId,
    onCheckForUpdates,
    persistConfig,
    pluginRegistry,
    pushRoute,
    quitApp,
    rootThemeBaseIdRef,
    setRootQuery,
    setRouteStack,
    skipTickerSearchDebounceRef,
    state,
    stateRef,
    themePickerRef,
    tickerRepository,
    tickers: state.tickers,
    updateTopRoute,
  });

  const getTickerSearchTickers = useCallback(() => stateRef.current.tickers, []);
  const hasPaneSettings = useCallback((paneId: string) => pluginRegistry.hasPaneSettings(paneId), [pluginRegistry]);

  const rootShortcutIntent = useMemo(() => parseRootShortcutIntent({
    query: rootQuery,
    commands: availableCommands,
    pluginCommands: getAvailablePluginCommands(),
    paneTemplates: getAvailablePaneShortcutTemplates(rootQuery),
    activeTicker: activeTickerSymbol,
  }), [activeTickerSymbol, availableCommands, getAvailablePaneShortcutTemplates, getAvailablePluginCommands, rootQuery]);

  const searchProviders = useMemo(
    () => getAvailableCommandBarSearchProviders(pluginRegistry, state.config.disabledPlugins),
    [pluginRegistry, state.config.disabledPlugins],
  );
  const searchProviderContext = useMemo(() => ({
    activeTicker: activeTickerSymbol,
    activeCollectionId,
  }), [activeCollectionId, activeTickerSymbol]);
  const closeAfterProviderResult = useCallback(() => {
    closeAll({ revertThemePreview: false });
  }, [closeAll]);
  const { providerResultItems, providerSearching } = useCommandBarSearchProviders({
    providers: searchProviders,
    query: rootQuery,
    // A resolved prefix means the user is running a command, so free-text
    // providers neither ask the network nor add rows.
    enabled: !currentRoute && rootShortcutIntent.kind === "none",
    context: searchProviderContext,
    onExecuted: closeAfterProviderResult,
  });
  const providerCategoryPriorities = useMemo(
    () => new Map(searchProviders.map((provider) => [provider.category, provider.priority ?? 0])),
    [searchProviders],
  );

  const {
    activeMatch,
    orderedRootResults,
    rootGhostSuffix,
    rootSearching,
    rootSectionOrder,
    rootShortcutFeedback,
    tickerSearchPending,
    tickerSearchResults,
  } = useCommandBarRootRuntime({
    activeCollectionId,
    activePortfolio,
    activeTickerData,
    activeTickerSymbol,
    availableCommands,
    buildLayoutItems,
    buildPaneSettingItems,
    buildTickerSearchResultItems,
    buildWindowModeItems,
    createPaneTemplateItem,
    createPluginCommandItem,
    currentRoute,
    dataProvider,
    executeCollectionCommand,
    getAvailablePaneShortcutTemplates,
    getTickers: getTickerSearchTickers,
    hasPaneSettings,
    localTickerSearchResultItems,
    nativeListScrollRef,
    nonShortcutPaneTemplateItems,
    openModeRoute,
    paneShortcutItems,
    pluginCommandItems,
    pluginCommandResultItems,
    providerResultItems,
    providerCategoryPriorities,
    providerSearching,
    readTickerSearchCache,
    rootModeKind: rootModeInfo.kind,
    rootQuery,
    rootSelectionNavigatedRef,
    rootShortcutIntent,
    runDirectCommand,
    runSecurityDescriptionShortcut,
    setRootHoveredIdx,
    setRootSelectedIdx,
    skipTickerSearchDebounceRef,
    state,
    tickerActionItems,
    writeTickerSearchCache,
  });
  const themePickerActive = !currentRoute && activeMatch?.command.id === "theme";
  const themePickerFilter = themePickerActive ? activeMatch.arg : "";

  const {
    acceptRootShortcutTab,
    acceptSelectedShortcutTab,
    activateListSelection,
    runRootQuery,
    setActiveListQuery,
  } = useCommandBarSelectionRuntime({
    activeTickerSymbol,
    availableCommands,
    clearThemePreview,
    closeAll,
    collectionWorkflowActions,
    createPaneTemplateItem,
    createPluginCommandItem,
    currentRoute,
    currentRouteRef,
    executeCollectionCommand,
    getAvailablePaneShortcutTemplates,
    getAvailablePluginCommands,
    openInlineConfirm,
    openModeRoute,
    openPaneTemplateWorkflow,
    persistLayoutChange,
    pluginCommandResultItems,
    pluginRegistry,
    rootModeKindRef,
    rootQuery,
    rootQueryRef,
    rootThemeBaseIdRef,
    runDirectCommand,
    runSecurityDescriptionShortcut,
    setRootQuery,
    setRouteStack,
    stateConfigLayout: state.config.layout,
    stateRef,
    updateTopRoute,
    updateWorkflowValue,
    visibleListStateRef,
  });
  const routeListState = useRouteListState({
    activeMatch,
    adaptTickerSearchRouteResult,
    buildLayoutItems,
    buildPaneSettingItems,
    currentRoute,
    orderedRootResults,
    pluginRegistry,
    rootCategoryPriorities: providerCategoryPriorities,
    rootHoveredIdx,
    rootModeKind: rootModeInfo.kind,
    rootQuery,
    rootSectionOrder,
    rootSearching,
    rootSelectedIdx,
    tickerSearchPending,
    tickerSearchResults,
  });
  useCommandBarRouteEffects({
    clearThemePreview,
    committedThemeId: state.config.theme,
    currentRoute,
    dataProvider,
    ensureRouteFieldFocus,
    lastMainBrowseRef,
    rootModeKind: rootModeInfo.kind,
    rootQuery,
    rootSelectedIdx,
    rootThemeBaseIdRef,
    updateTopRoute,
  });

  const panelProps = useCommandBarPanelRuntime({
    acceptRootShortcutTab,
    acceptSelectedShortcutTab,
    activateListSelection,
    applyThemePreview,
    cellHeightPx,
    cellWidthPx,
    closeAll,
    commitTheme,
    committedThemeId: state.config.theme,
    confirmCurrentRoute,
    currentRoute,
    currentRouteRef,
    dismissCommandBar,
    focusWorkflowField,
    getWorkflowInputRef,
    getWorkflowFieldStringValue,
    markRootSelectionNavigated,
    moveWorkflowFocus,
    nativeListScrollRef,
    nativePaneChrome,
    nativeWindowChrome,
    onNativeOccluderChange,
    openWorkflowFieldPicker,
    persistConfig,
    pluginRegistry,
    popRoute,
    rootModeKind: rootModeInfo.kind,
    rootGhostSuffix,
    rootShortcutFeedback,
    routeListState,
    setActiveListQuery,
    setRootHoveredIdx,
    setRootSelectedIdx,
    setRouteStack,
    setWorkflowNativeSelectRef,
    stateRef,
    submitWorkflowRoute,
    syncActiveWorkflowTextarea,
    termHeight,
    termWidth,
    themePickerActive,
    themePickerFilter,
    themePickerRef,
    titleBarOverlay,
    updateTopRoute,
    updateWorkflowValue,
    visibleListStateRef,
    workflowNativeSelectRefs,
    workflowScrollRef,
  });

  return (
    <CommandBarPanel {...panelProps} />
  );
}
