<div align="center">

# Surge

**Open-source energy markets terminal. Fast, keyboard-driven, and extensible.**

Desktop app for macOS and Windows. Terminal UI for macOS, Linux, and Windows.

</div>

Surge is a terminal for power and gas traders: European day-ahead prices, load,
renewables, cross-border flows and generation stacks from ENTSO-E, next to the
commodity futures, FX and news that move them. It is a fork of
[Gloomberb](https://github.com/gloom-sh/gloomberb) with the equity research
replaced by energy markets.

- **Watch the grid:** day-ahead prices for every bidding zone, load vs forecast, wind and solar forecast vs actual, cross-border flows, zone spreads, and the generation mix.
- **Follow the wider market:** Brent, WTI, TTF, Henry Hub, products, metals, FX and rates, plus an energy-focused news wire.
- **Never miss a gate:** the market schedule counts down SDAC and IDA gate closures, ENTSO-E publications, AGSI storage and futures settlements in CET.
- **Make it yours:** docked and floating panes, saved layouts, alerts, notes, and a plugin system for new data sources and panes.

The desktop app and TUI share the command language and plugin system.

## Install

macOS and Linux:

```bash
curl -fsSL https://nickmcblain.github.io/surge/install.sh | sh
```

or with Homebrew: `brew install nickmcblain/tap/surge`. Windows and the desktop
apps are on the [releases page](https://github.com/nickmcblain/surge/releases);
the desktop builds are unsigned previews for now, see the
[installation guide](docs/installation.md).

From source (requires [Bun](https://bun.sh) 1.4 or newer):

```bash
git clone https://github.com/nickmcblain/surge
cd surge
bun install
bun run dev            # terminal UI
bun run desktop:dev    # desktop app
```

For charts in the terminal, use a Kitty-compatible terminal such as Ghostty,
Kitty, or WezTerm.

## ENTSO-E token

Power data comes from the [ENTSO-E Transparency Platform](https://transparency.entsoe.eu/).
Register there, request a *Restful API* token from your account settings, then either

```bash
export SURGE_ENTSOE_TOKEN=...
```

or run `ENTSOE` in the command bar to store it locally. Everything else works
without a token.

## Start

Press `Ctrl+P` to open the command bar. Desktop also supports `Cmd/Ctrl+K`.

| Try | Opens |
|-----|-------|
| `ZP` | Zone price board: today, yesterday and tomorrow across Europe |
| `DA FR` | Day-ahead price curve for a bidding zone |
| `ZONE DE-LU` | Zone overview: prices, load, renewables, generation stack |
| `LOAD NL` | Actual load vs forecast |
| `RES DE-LU` | Wind and solar forecast vs actual |
| `FLOW DE-LU > FR` | Cross-border scheduled flow |
| `SPRD DE-LU FR` | Day-ahead spread between two zones |
| `GEN ES` | Generation mix by fuel |
| `CAL` | Market schedule with countdowns |
| `FUT` | Energy commodities board |
| `HELP` | Commands and keyboard shortcuts |

Use `Tab` to switch panes and `j` / `k` to navigate lists. The [user guide](docs/usage.md)
covers layouts, keyboard shortcuts, and the full command reference.

## CLI

Run commands directly from your shell:

```bash
surge da DE-LU
surge da FR --json
surge quote TTF=F
surge help
```

Output is human-readable by default; use `--json`, `--csv`, or `--ndjson` for scripts.

## Plugins and contributing

Plugins add panes, data providers, and commands. See the
[plugin development guide](PLUGINS.md) and the [contributing guide](CONTRIBUTING.md).

[MIT licensed](LICENSE). Forked from [Gloomberb](https://github.com/gloom-sh/gloomberb).
Built with [OpenTUI](https://opentui.com/) and [Electrobun](https://electrobun.dev/).
