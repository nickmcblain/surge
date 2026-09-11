# User guide

[Back to README](../README.md) · [Installation](installation.md) · [Browser app](browser.md)

- [Keyboard shortcuts](#keyboard)
- [Command reference and chart composer](#command-reference)
- [CLI commands and output formats](#cli)
- [Broker position sync](#broker-position-sync)
- [Surge Cloud sign-in](#surge-cloud-sign-in)
- [Interface language](#localized-interface)
- [Live TV](#live-tv)

The desktop app and TUI share the command language and plugin system. The [browser app](browser.md) offers a smaller feature set. Use `HELP` in the app or `surge help` in your shell for the commands available in your installation.

## Keyboard

| Key | Action |
|-----|--------|
| `Ctrl+P` | Open command mode |
| `` ` `` | Open ticker search |
| `Ctrl+,` | Open focused pane settings |
| `Ctrl+W` | Close focused pane |
| `Ctrl+Shift+M` | Move focused window (`WIN resize` starts resize mode) |
| `Ctrl+Shift+D` | Dock or float focused pane |
| `Ctrl+Shift+E` | Export focused pane table as CSV |
| `Ctrl+Shift+L` | Layout actions |
| `Ctrl+Shift+G` | Tidy windows |
| `Tab` | Switch panes |
| `j` / `k` | Navigate lists |
| `h` / `l` | Switch tabs |
| `m` | Cycle chart mode |
| `q` | Quit |

Desktop builds also accept `Cmd/Ctrl+K` for the command bar, the matching `Cmd` shortcuts on macOS, `Cmd/Ctrl+Shift+O` to pop out a pane, and `Cmd/Ctrl+Shift+C` to copy a focused pane screenshot.

## Command Reference

Use `HELP` inside Surge for the live shortcut list. The common command-bar prefixes are listed here for quick scanning.

### Company Research

| Shortcut | Function |
|----------|----------|
| `DES <ticker>` / `T <ticker>` | Security details for a ticker |
| `FA <ticker>` | Financial statement view |
| `G <series>` | Custom chart composer |
| `CAT [query]` | Browse and search chartable series |
| `GP <ticker>` | Price chart |
| `GIP <ticker>` | Intraday price chart |
| `HP <ticker>` | Historical OHLCV prices |
| `GF <tickers>` | Fundamental statement graph |
| `GE <tickers>` | Valuation multiple graph |
| `GR <tickers>` | Security relationship graph |
| `EE <ticker>` | Events view with earnings and revenue estimates |
| `EM [tickers]` | Earnings monitor |
| `SRCH [query]` | Full-text search across earnings call transcripts, news, and SEC filings |
| `QQ <tickers>` | Ticker quote monitor |
| `CMP <tickers>` | Normalized price comparison |
| `CORR <tickers>` | Ticker return correlations |
| `ANR <ticker>` | Analyst targets and ratings |
| `DIAG <ticker>` | Equity Diagnostic with cited flags and anomalies |
| `SEC <ticker>` | SEC filings and company disclosures |
| `OMON <ticker>` | Options monitor |
| `OVME` | Black-Scholes option calculator with Greeks and implied volatility |
| `HDS <ticker>` | Institutional holders |
| `DVD <ticker>` | Dividend yield and history |
| `SI <ticker>` | Short interest |
| `13F [fund/ticker/CIK]` | 13F fund filings and holdings |
| `INS <ticker>` | Insider activity |
| `EVT <ticker>` | Corporate actions, earnings, and estimates |
| `RV <tickers>` | Relative valuation |

### Chart Composer

`G`, `GP`, `GIP`, `CMP`, `GF`, and `GE` all open the same chart composer with different starting presets. `CAT` opens a searchable catalog of those chartable series so you can graph one without typing the expression. A custom expression can mix unrelated data sources on one synchronized timeline:

```text
G AAPL:price, MSFT:revenue, FRED:CPIAUCSL
```

Open **Series** to add, remove, reorder, or hide series and choose each series' field, chart style, transform, axis, panel, period, and panel scale. Price data supports candles, OHLC, HLC, line, and area; scalar data supports its compatible line, area, step, column, and point modes. Panels can use independent left/right axes and linear or logarithmic scales.

The toolbar controls preset or exact date ranges, intervals from one minute through monthly, the primary chart mode, technical indicators, and pair formulas. Indicators include volume, SMA, EMA, Bollinger Bands, RSI, and MACD; formulas include ratio, spread, and rolling correlation. Mixed-frequency values use as-of alignment: fundamentals use filing dates when available, sparse series carry forward only after becoming available, and missing publication dates are called out in the chart status.

### Markets, News, and Macro

| Shortcut | Function |
|----------|----------|
| `TOP` | Ranked market stories |
| `HM` | Market heatmap for large US stocks and ETFs |
| `MOST` | Top gainers, losers, most active, and trending tickers |
| `HILO` | Session new highs and new lows with 30s/1m/5m momentum |
| `FLOW` | Unusual options activity: sweeps, blocks, and large premium |
| `PM <query>` | Polymarket and Kalshi prediction data |
| `N` | News feed |
| `CN <ticker>` | Ticker news |
| `NI` | Sector news |
| `SUB` | Authenticated Substack reader feed |
| `FIRST` | Breaking news |
| `TWIT <query>` | Ticker-related market posts |
| `TBO` | TheBuildout infrastructure intelligence |
| `CG` | Congress trading disclosures |
| `WEI` | Global equity indices |
| `MAP` | Live world venue map with local market status and clocks |
| `FUT` | Front-month futures across index, rates, energy, metals, grains, and FX |
| `ECO` | Economic events and releases |
| `ECST [statistic]` | Economic statistics: inflation, labour, growth, consumer, housing, rates |
| `GC [YYYY-MM-DD]` | Treasury yield curve for the latest session or a historical date; CLI also accepts `--date YYYY-MM-DD` |
| `AUCT` | Treasury auction results: high rate, bid-to-cover, indirect share, and size |
| `VIX` | VIX 30-day/3-month implied-volatility curve |
| `CRD` | Credit spreads |
| `VAL [indicator]` | Whole-market valuation: Buffett, CAPE, excess CAPE yield, Tobin Q, investor equity allocation, dividend yield, margin debt, cap/profits, cap/M2 |
| `CDS [ticker]` | Single-name corporate CDS activity: most-active issuers, or one issuer's trades |
| `ERN` | Earnings calendar |
| `IPO` | Upcoming and recent IPOs |
| `HALT` | US trading halts with reason and resumption times |
| `TV` | Live Bloomberg, CNBC, and Yahoo Finance television ([TV plugin](https://github.com/surge-sh/surge-tv)) |
| `BI` / `SP` | S&P 500 sector performance |
| `FXC` | Major FX cross rates |
| `FNG` | Fear and greed market gauge |

### Workspace and App Controls

| Shortcut | Function |
|----------|----------|
| `PF` | Portfolio and watchlist workspace |
| `PORT` | Portfolio risk and sector exposure |
| `ALRT` | Price alerts |
| `SA <symbol condition price>` | Create a price alert |
| `AI <prompt>` | AI screener |
| `AGENT` | Local AI research workspace |
| `CHAT [channel]` | Surge Cloud chat |
| `DM @user [@user...]` | Open or start a direct or group chat |
| `ACM` | Surge Cloud account settings |
| `NOTE` | Notes |
| `IBKR` | IBKR trading pane |
| `BR` | Broker connections |
| `CHG` | Changelog |
| `HELP` | Open shortcut and layout help |
| `AW` / `AP <ticker>` | Add a ticker to the active watchlist or portfolio |
| `RW` / `RP <ticker>` | Remove a ticker from the active watchlist or portfolio |
| `PS` | Open focused pane settings |
| `LAY` | Open the layout browser to switch, publish, or add layouts |
| `LMA <query>` | Layout and pane arrangement actions |
| `WIN move\|resize` | Move or resize the focused window |
| `GL` | Tidy all windows |
| `SB` | Toggle the status bar |
| `VF` | Toggle quote value flashing |
| `TH <theme>` | Change color theme |
| `FONT+` / `FONT-` | Increase or decrease desktop font size |
| `CONN` | Connection health |
| `POLL` | Prediction-market polls |
| `UPGRADE` | Account upgrade |
| `CR` | Cycle chart renderer |
| `LANG <locale>` | Change interface language (`auto`, `en`, `es`, `zh-CN`, `zh-TW`, `ja`, or `ko`) |
| `PL <plugin>` | Manage plugins |

Published layouts preserve portable pane setup and state, including searches, chart viewport, and drawings. Credentials, accounts, portfolios, and pane fields marked private stay local. Publishing copies a durable `term.gloom.sh/l/...` link for social sharing.

## CLI

Running `surge` with no arguments launches the terminal UI. Normal commands run through a headless CLI path; use `surge launch-ui` when a script should explicitly open the UI.

Human-readable output is the default. Automation can opt into structured output with `--json`, `--csv`, or `--ndjson`. JSON output favors the richest fetched model available and includes display-column metadata when a command has table columns; CSV and NDJSON use the command's tabular row view. Common global flags include `--limit`, `--refresh`, `--quiet`, `--no-color`, `--dry-run`, and `--yes`.

| Command | Use |
|---------|-----|
| `surge` | Launch the terminal UI |
| `surge launch-ui` | Explicitly launch the terminal UI |
| `surge help` | Show all CLI commands |
| `surge api list\|get\|invoke\|subscribe` | Inspect and call plugin capabilities directly |
| `surge quote <symbols>` | Fetch current quotes |
| `surge search <query>` / `provider-search <query>` | Search tickers and provider symbols |
| `surge ticker <symbol>` | Show quote, ownership, and financials |
| `surge history\|financials\|fundamentals\|options <symbol>` | Fetch research data |
| `surge news\|filings\|holders\|insider\|13f\|analyst\|events\|valuation <symbol>` | Fetch company research feeds |
| `surge movers\|indices\|sectors\|fx\|fear-greed\|earnings` | Fetch market overview data |
| `surge econ\|fred\|yield-curve` | Fetch macro data |
| `surge compare\|correlation\|relationship <symbols>` | Compare securities |
| `surge portfolio [action]` | Manage manual portfolios |
| `surge watchlist [action]` | Manage watchlists |
| `surge notes\|alerts [action]` | Manage local notes and alerts |
| `surge broker\|ibkr [action]` | Inspect broker profiles |
| `surge ai providers\|ask` | Use configured AI providers |
| `surge rss fetch <url>` | Fetch an RSS feed |
| `surge provider status` | Inspect enabled data providers |
| `surge config\|cache\|plugin\|layout\|pane\|debug\|doctor\|version\|changelog` | Inspect and manage local app state |
| `surge fn [...]` | Run a pane-backed report command |
| `surge shot [...]` | Capture a pane-backed screenshot |
| `surge predictions [...]` | Launch Prediction Markets |
| `surge plugins` | List installed plugins |
| `surge install <user/repo>` | Install a plugin from GitHub |
| `surge remove <name>` | Remove an installed plugin |
| `surge update [name]` | Update plugins |

## Broker position sync

Use **New Portfolio** or **Add Broker Account** to connect a broker. Surge can import positions from Interactive Brokers, Public, Robinhood, and SimpleFIN.

Each broker is a plugin with its own repository, installed on first launch and updatable on its own. Manage them from the plugin directory, or with `surge install nickmc-lumion/surge-public` and friends.

- Robinhood opens a browser sign-in page. Surge uses only the read-only account and equity-position tools from the Robinhood Trading MCP server.
- Public needs an API secret from Public API settings. Surge creates a short-lived access token and uses only the account and portfolio endpoints.
- SimpleFIN needs a one-time setup token from SimpleFIN Bridge. Surge exchanges the token and imports only accounts that contain holdings.

Surge saves the connection data on the local device. It does not include this data in Surge Cloud synchronization. A later position sync updates the managed portfolios and removes positions that the broker no longer reports.

## Surge Cloud sign-in

Sign in with email and password, or pick `Log In with QR Code` from the command bar and scan the code with the Surge mobile companion app to sign the terminal in without typing. The onboarding wizard offers the same QR option as the recommended path, with email and password as the alternative.

## Localized interface

Surge includes English, Spanish, Simplified Chinese, Traditional Chinese, Japanese, and Korean UI support. English remains the default fallback language.

- **Automatic detection:** supported `LANG` / `LC_ALL` and desktop system locales select the matching interface automatically.
- **Command switching:** enter `LANG` in the command bar (Ctrl+P) to cycle languages, or use `LANG auto`, `LANG en`, `LANG es`, `LANG zh-CN`, `LANG zh-TW`, `LANG ja`, or `LANG ko`. The choice is persisted in `config.json`.
- **One-run override:** `SURGE_LANG=ja surge` (or another supported locale) takes highest priority in environments that expose process locale variables.

## Live TV

Install [TV](https://github.com/nickmc-lumion/surge-tv) with `surge install nickmc-lumion/surge-tv`. Existing installations restore it once after upgrading. Live TV in the terminal also requires `mpv` with Kitty video output. Surge resolves the stream in JavaScript and runs `mpv` with its `yt-dlp` integration disabled, so `yt-dlp` is not required.
