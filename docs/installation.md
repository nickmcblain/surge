# Installation

[Back to README](../README.md)

Packaged builds (Homebrew cask, Windows installer, standalone TUI binaries) are
produced by the release workflow in `.github/workflows/release.yml` and attach to
[GitHub Releases](https://github.com/nickmc-lumion/surge/releases). Until a
release is published, run from source.

## From source

Requires [Bun](https://bun.sh) 1.4 or newer.

```bash
git clone https://github.com/nickmc-lumion/surge
cd surge
bun install
bun run dev            # terminal UI
bun run desktop:dev    # desktop app (macOS / Windows)
```

`bun run build` compiles the standalone `surge` TUI binary for the current
platform into `dist/`; `bun run build:all` cross-compiles every target.
`bun run desktop:build` produces the Electrobun desktop bundle.

## macOS

Once a release exists:

```bash
brew install --cask nickmc-lumion/tap/surge
```

This installs `Surge.app` and a `surge` command that runs the TUI through the app
bundle. `Surge.app` is Apple Silicon (arm64) only; on an Intel Mac use the
standalone `surge` terminal binary from the release page instead.

## Linux

Download the standalone TUI binary for your architecture from the release page
and place it on your `PATH`. A Linux desktop package is not published.

## Windows

Download `stable-win-x64-SurgeSetup.exe` from the release page. The installer
supports Windows 11 on x64 and ARM64 (via x64 emulation) and includes the
`surge` terminal command.

## Terminal

For charts in the terminal, use a [Kitty](https://sw.kovidgoyal.net/kitty/)-compatible
terminal such as Ghostty, Kitty, or WezTerm. Other terminals fall back to
block-character charts.

## Configuration

Surge stores its configuration, cache and plugins under `~/.surge`. Set
`SURGE_ENTSOE_TOKEN` (or run `ENTSOE` inside the app) to enable the European
power panes; see the [user guide](usage.md#entso-e-token).
