# Installation

[Back to README](../README.md)

Releases are built by `.github/workflows/release.yml` and attached to
[GitHub Releases](https://github.com/nickmcblain/surge/releases): standalone
`surge` terminal binaries for macOS (Apple Silicon and Intel) and Linux (x64 and
arm64), a Windows installer, and macOS desktop bundles.

## Terminal (recommended)

macOS and Linux, one line:

```bash
curl -fsSL https://nickmcblain.github.io/surge/install.sh | sh
```

The script picks the binary for your platform, installs it to `~/.local/bin/surge`
(override with `SURGE_INSTALL_DIR`) and never asks for sudo unless that directory
needs it. Run `surge` to start.

Homebrew:

```bash
brew install nickmcblain/tap/surge
```

Or download `surge-<os>-<arch>.gz` from the release page, `gunzip` it, and put
it on your `PATH`.

For charts in the terminal, use a [Kitty](https://sw.kovidgoyal.net/kitty/)-compatible
terminal such as Ghostty, Kitty, or WezTerm. Other terminals fall back to
block-character charts.

## Desktop apps (unsigned previews)

The desktop builds are not yet code-signed, so both operating systems warn on
first launch.

**macOS** (Apple Silicon only): download `stable-macos-arm64-Surge.dmg`, drag
`Surge.app` to Applications, then clear the quarantine flag once:

```bash
xattr -d com.apple.quarantine /Applications/Surge.app
```

The installer script can do this for you: `SURGE_DESKTOP=1 curl -fsSL ... | sh`
installs `Surge.app` and links its bundled `surge` terminal command.

**Windows**: download `stable-win-x64-SurgeSetup.exe`. SmartScreen will show
"Windows protected your PC"; choose *More info* then *Run anyway*. The installer
supports Windows 11 on x64 and ARM64 (via x64 emulation) and includes the
`surge` terminal command.

## From source

Requires [Bun](https://bun.sh) 1.4 or newer.

```bash
git clone https://github.com/nickmcblain/surge
cd surge
bun install
bun run dev            # terminal UI
bun run desktop:dev    # desktop app (macOS / Windows)
```

`bun run build` compiles the standalone `surge` TUI binary for the current
platform into `dist/`; `bun run build:all` cross-compiles every target.
`bun run desktop:build` produces the Electrobun desktop bundle.

## Configuration

Surge stores its configuration, cache and plugins under `~/.surge`. Set
`SURGE_ENTSOE_TOKEN` (or run `ENTSOE` inside the app) to enable the European
power panes; see the [user guide](usage.md#entso-e-token).
