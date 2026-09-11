import type { RssFeedConfig } from "./rss/parser";

/**
 * Bundled energy-market wire so a fresh terminal has something to read.
 * All of these are public, key-free RSS endpoints verified to respond; users
 * can disable any of them and add their own with the Add News Feed command.
 */
export const DEFAULT_FEEDS: RssFeedConfig[] = [
  {
    id: "default-power-prices",
    url: "https://news.google.com/rss/search?q=%22day-ahead%22+OR+%22power+prices%22+europe+electricity&hl=en-GB&gl=GB&ceid=GB:en",
    name: "Power Prices",
    category: "power",
    authority: 70,
    enabled: true,
  },
  {
    id: "default-gas-prices",
    url: "https://news.google.com/rss/search?q=TTF+gas+prices+europe&hl=en-GB&gl=GB&ceid=GB:en",
    name: "Gas Markets",
    category: "gas",
    authority: 70,
    enabled: true,
  },
  {
    id: "default-acer",
    url: "https://www.acer.europa.eu/rss.xml",
    name: "ACER",
    category: "regulation",
    authority: 90,
    enabled: true,
  },
  {
    id: "default-ember",
    url: "https://ember-energy.org/feed/",
    name: "Ember",
    category: "analysis",
    authority: 75,
    enabled: true,
  },
  {
    id: "default-carbon-brief",
    url: "https://www.carbonbrief.org/feed/",
    name: "Carbon Brief",
    category: "carbon",
    authority: 70,
    enabled: true,
  },
  {
    id: "default-energy-monitor",
    url: "https://www.energymonitor.ai/feed/",
    name: "Energy Monitor",
    category: "power",
    authority: 65,
    enabled: true,
  },
  {
    id: "default-energy-live-news",
    url: "https://www.energylivenews.com/feed/",
    name: "Energy Live News",
    category: "power",
    authority: 55,
    enabled: true,
  },
  {
    id: "default-utility-dive",
    url: "https://www.utilitydive.com/feeds/news/",
    name: "Utility Dive",
    category: "grid",
    authority: 65,
    enabled: true,
  },
  {
    id: "default-pv-magazine",
    url: "https://www.pv-magazine.com/feed/",
    name: "pv magazine",
    category: "renewables",
    authority: 60,
    enabled: true,
  },
  {
    id: "default-offshore-wind",
    url: "https://www.offshorewind.biz/feed/",
    name: "offshoreWIND.biz",
    category: "renewables",
    authority: 60,
    enabled: true,
  },
  {
    id: "default-energy-storage",
    url: "https://www.energy-storage.news/feed/",
    name: "Energy-Storage.news",
    category: "storage",
    authority: 60,
    enabled: true,
  },
  {
    id: "default-oilprice",
    url: "https://oilprice.com/rss/main",
    name: "OilPrice",
    category: "commodities",
    authority: 55,
    enabled: false,
  },
];
