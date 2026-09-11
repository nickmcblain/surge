import { changelogModule } from "./changelog";
import { chartComposerModule } from "./chart-composer";
import { connectionsModule } from "./connections";
import { energyModules } from "./energy";
import { pluginMarketplaceModule } from "./plugin-marketplace";
import { futuresModule } from "./futures";
import { fxMatrixModule } from "./fx-matrix";
import { helpModule } from "./help";
import { layoutManagerModule } from "./layout-manager";
import { composeBuiltinPlugin } from "./plugin-module";

export const applicationPlugin = composeBuiltinPlugin({
  id: "application",
  name: "Application",
  version: "1.0.0",
  description: "Core layout, help, and release information.",
  modules: [layoutManagerModule, pluginMarketplaceModule, helpModule, changelogModule, connectionsModule],
});

export const energyPlugin = composeBuiltinPlugin({
  id: "energy",
  name: "European Power",
  version: "1.0.0",
  description: "ENTSO-E day-ahead prices, load, renewables, flows, generation mix and the market schedule.",
  modules: [...energyModules],
});

export const marketOverviewPlugin = composeBuiltinPlugin({
  id: "market-overview",
  name: "Market Overview",
  version: "1.0.0",
  description: "Energy commodities, FX, and custom chart composer.",
  toggleable: true,
  modules: [
    fxMatrixModule,
    futuresModule,
    chartComposerModule,
  ],
});
