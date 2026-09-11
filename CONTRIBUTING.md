# Contributing

## Running locally

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/nickmc-lumion/surge.git
cd surge
bun install
bun run dev            # terminal UI
bun run desktop:dev    # desktop app
```

## Building plugins

See [PLUGINS.md](PLUGINS.md) for a guide on building your own plugins.

## Verifying a change

```bash
bun run typecheck
bun test
bun run plugins:manifest:check
```

`bun run typecheck` runs TypeScript 7 over the TUI, desktop and script projects. Plugin manifest changes must be regenerated with `bun run plugins:manifest`.

## Energy data

European power data comes from the ENTSO-E Transparency Platform. Set `SURGE_ENTSOE_TOKEN` (or run `ENTSOE` in the app) to exercise the live panes; the XML parser and series helpers are covered by unit tests that do not need a token.

## Localization

- Locale dictionaries live in [src/i18n](src/i18n), keyed by the original English UI text. Missing entries safely fall back to English.
- Shared render sinks call `t()` / `tf()` / `tc()` for pane titles, the command bar, menus, settings, tabs, help, and onboarding.
- Finance abbreviations such as BID, ASK, and CHG% intentionally remain in English for terminal conventions and fixed-width alignment.
- CJK wide characters and grapheme clusters are measured by [src/utils/format.ts](src/utils/format.ts) using terminal display-cell widths.
