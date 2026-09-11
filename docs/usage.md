# User guide

[Back to README](../README.md) · [Installation](installation.md)

- [Keyboard shortcuts](#keyboard)
- [Command reference](#command-reference)
- [CLI commands and output formats](#cli)
- [ENTSO-E token](#entso-e-token)
- [Interface language](#localized-interface)

The desktop app and TUI share the command language and plugin system. Use `HELP` in the app or `surge help` in your shell for the commands available in your installation.

## Keyboard

| Key | Action |
|-----|--------|
| `Ctrl+P` | Open command mode |
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
| `r` | Refresh the focused energy pane |
| `m` | Cycle chart mode |
| `q` | Quit |

Desktop builds also accept `Cmd/Ctrl+K` for the command bar, the matching `Cmd` shortcuts on macOS, `Cmd/Ctrl+Shift+O` to pop out a pane, and `Cmd/Ctrl+Shift+C` to copy a focused pane screenshot.

## Command Reference

Use `HELP` inside Surge for the live shortcut list. The common command-bar prefixes are listed here for quick scanning. Zone arguments accept the codes in the table at the bottom of `surge help` (`DE-LU`, `FR`, `NO2`, `IT-NORD`, ...).

### European Power

| Shortcut | Function |
|----------|----------|
| `ZP` | Zone price board: current, baseload and peak day-ahead prices for every zone, with yesterday and tomorrow deltas. `Enter` opens the zone's `DA` chart |
| `ZONE <zone>` | Zone overview: day-ahead stats, load vs forecast, renewables forecast and the generation stack |
| `DA <zone>` | Day-ahead price curve with yesterday overlaid; header shows base, peak, off-peak, min and max |
| `LOAD <zone>` | Actual load vs day-ahead load forecast |
| `RES <zone>` | Wind (onshore + offshore) and solar forecast vs actual generation |
| `FLOW <zone> > <zone>` | Scheduled cross-border flow between two zones, net of the return direction |
| `SPRD <zone> <zone>` | Day-ahead price spread between two zones |
| `GEN <zone>` | Generation mix by fuel type with share, day average and peak |
| `CAL` | Market schedule: SDAC and IDA gate closures, ENTSO-E publications, AGSI storage, EEX and ICE settlements, in CET with countdowns |
| `ENTSOE` | Store or replace your ENTSO-E Transparency API token |

Every energy pane has a **Yesterday / Today / Tomorrow** selector and a zone setting (`Ctrl+,`). Data is cached locally and refreshed on an interval; press `r` to force a reload. Tomorrow's day-ahead prices appear after the SDAC results publish (~12:45 CET).

### Markets and News

| Shortcut | Function |
|----------|----------|
| `FUT` | Energy commodities board: Brent, WTI, heating oil, RBOB, TTF, Henry Hub, metals, FX and rates |
| `FXC` | Major FX cross rates |
| `G <series>` | Custom chart composer, e.g. `G FUT:TTF, FUT:NG` |
| `GP <symbol>` / `GIP <symbol>` | Price chart / intraday chart for any Yahoo symbol, e.g. `GP BZ=F` |
| `CMP <symbols>` | Normalized price comparison |
| `CAT [query]` | Browse and search chartable series |
| `N` | News feed from the configured energy wires |
| `TOP` | Ranked stories |
| `NI` | Sector news |
| `FIRST` | Breaking news |

### Chart Composer

`G`, `GP`, `GIP` and `CMP` open the same chart composer with different starting presets. A custom expression can mix sources on one synchronized timeline:

```text
G FUT:TTF, FUT:BZ, FRED:DCOILBRENTEU
```

Open **Series** to add, remove, reorder, or hide series and choose each series' field, chart style, transform, axis, panel, period, and panel scale. Panels can use independent left/right axes and linear or logarithmic scales. The toolbar controls date ranges, intervals from one minute through monthly, technical indicators (volume, SMA, EMA, Bollinger Bands, RSI, MACD) and pair formulas (ratio, spread, rolling correlation).

### Workspace and App Controls

| Shortcut | Function |
|----------|----------|
| `ALRT` | Price alerts |
| `NOTE` | Notes |
| `CHG` | Changelog |
| `HELP` | Open shortcut and layout help |
| `PS` | Open focused pane settings |
| `LAY` | Open the layout browser to switch or add layouts |
| `LMA <query>` | Layout and pane arrangement actions |
| `WIN move\|resize` | Move or resize the focused window |
| `GL` | Tidy all windows |
| `SB` | Toggle the status bar |
| `VF` | Toggle quote value flashing |
| `TH <theme>` | Change color theme |
| `FONT+` / `FONT-` | Increase or decrease desktop font size |
| `CONN` | Connection health |
| `CR` | Cycle chart renderer |
| `LANG <locale>` | Change interface language |
| `PL <plugin>` | Manage plugins |

Three layouts ship by default: **Home** (zone board, generation mix, zone overview, news, day-ahead chart, market schedule), **Monitor** and **Macro**. Switch with `Ctrl+1/2/3`.

## CLI

Running `surge` with no arguments launches the terminal UI. Normal commands run through a headless CLI path; use `surge launch-ui` when a script should explicitly open the UI.

Human-readable output is the default. Automation can opt into structured output with `--json`, `--csv`, or `--ndjson`. Common global flags include `--limit`, `--refresh`, `--quiet`, `--no-color`, `--dry-run`, and `--yes`.

| Command | Use |
|---------|-----|
| `surge` | Launch the terminal UI |
| `surge help` | Show all CLI commands and the bidding-zone list |
| `surge da <zone> [--tomorrow\|--yesterday]` | Day-ahead prices for a bidding zone with baseload, peak and off-peak stats |
| `surge quote <symbols>` | Fetch current quotes, e.g. `surge quote TTF=F BZ=F` |
| `surge history <symbol> [--range 1Y]` | Fetch historical prices |
| `surge fx <currency>` | Exchange rate into the configured base currency |
| `surge news [--feed latest\|top]` | Fetch the news wire |
| `surge rss fetch <url>` | Fetch an RSS feed |
| `surge fn <pane> [argument]` | Run a pane-backed report command headlessly |
| `surge shot <pane> [argument]` | Capture a pane-backed screenshot |
| `surge catalog [query]` | List pane-backed functions available to `fn` and `shot` |
| `surge api list\|get\|invoke\|subscribe` | Inspect and call plugin capabilities directly |
| `surge notes\|alerts [action]` | Manage local notes and alerts |
| `surge config\|cache\|plugin\|layout\|pane\|debug\|doctor\|version\|changelog` | Inspect and manage local app state |
| `surge plugins` / `install <user/repo>` / `remove <name>` / `update [name]` | Manage plugins |

Equity research commands inherited from Gloomberb (`ticker`, `financials`, `filings`, `options`, ...) are still registered and run against the Yahoo provider.

## ENTSO-E token

Power data comes from the [ENTSO-E Transparency Platform](https://transparency.entsoe.eu/). Register, then request a *Restful API* token from *My Account Settings*. Provide it one of two ways:

- `export SURGE_ENTSOE_TOKEN=...` in your shell, or
- run `ENTSOE` in the command bar; the token is stored in the local config under `~/.surge`.

The environment variable wins when both are present. Requests are rate-limited by ENTSO-E to 400 per minute per token; Surge caches every day-window locally and only refetches on demand or when the pane's interval elapses.

## Localized interface

Surge includes English, Spanish, Simplified Chinese, Traditional Chinese, Japanese, and Korean UI support inherited from Gloomberb. English remains the default fallback language.

- **Automatic detection:** supported `LANG` / `LC_ALL` and desktop system locales select the matching interface automatically.
- **Command switching:** enter `LANG` in the command bar (Ctrl+P) to cycle languages, or use `LANG auto`, `LANG en`, `LANG es`, `LANG zh-CN`, `LANG zh-TW`, `LANG ja`, or `LANG ko`. The choice is persisted in `config.json`.
- **One-run override:** `SURGE_LANG=ja surge` takes highest priority in environments that expose process locale variables.
