import type { PluginModule } from "../plugin-module";
import { attachEntsoePersistence, loadDayAhead, resetEntsoePersistence, zoneDay } from "./data";
import { priceStats } from "./stats";
import { formatLocalTime } from "./time";
import { attachEntsoeTokenSource, ENTSOE_TOKEN_ENV, ENTSOE_TOKEN_KEY, getEntsoeToken } from "./token";
import { BIDDING_ZONES, resolveZone } from "./zones";

export { resolveZone, BIDDING_ZONES } from "./zones";

/**
 * Data-only module: owns the ENTSO-E token, the disk cache, and the `entsoe`
 * CLI command. Panes live in sibling modules and share this plugin's config.
 */
export const entsoeModule: PluginModule = {
  setup(ctx) {
    attachEntsoeTokenSource(ctx.configState);
    attachEntsoePersistence(ctx.persistence);

    ctx.registerCommand({
      id: "entsoe-setup",
      label: "ENTSO-E Setup",
      shortcut: "ENTSOE",
      keywords: ["entsoe", "token", "api", "setup", "energy", "transparency"],
      category: "config",
      description: "Store the ENTSO-E Transparency Platform security token",
      wizardLayout: "form",
      wizard: [
        {
          key: "token",
          label: "Security token",
          type: "password",
          placeholder: "Paste the token from transparency.entsoe.eu",
          required: true,
        },
        {
          key: "info",
          label: "Where to get one",
          type: "info",
          body: [
            "Register at transparency.entsoe.eu, then email transparency@entsoe.eu",
            "with the subject \"Restful API access\" from the same address.",
            `Alternatively set ${ENTSOE_TOKEN_ENV} in your environment.`,
          ],
        },
      ],
      async execute(values) {
        const token = values?.token?.trim();
        if (!token) return;
        await ctx.configState.set(ENTSOE_TOKEN_KEY, token);
        ctx.notify({ body: "ENTSO-E token saved.", type: "success" });
      },
    });
  },

  dispose() {
    resetEntsoePersistence();
    attachEntsoeTokenSource(null);
  },

  cliCommands: [
    {
      name: "da",
      description: "Day-ahead prices for a bidding zone (e.g. `da DE-LU`, `da FR --tomorrow`)",
      help: {
        usage: ["da <zone> [--tomorrow|--yesterday]"],
        sections: [{
          title: "Zones",
          lines: [BIDDING_ZONES.map((zone) => zone.code).join(", ")],
        }],
      },
      async execute(args, ctx) {
        const zone = resolveZone(args.find((arg) => !arg.startsWith("--")));
        if (!zone) return ctx.fail("Unknown bidding zone.", `Try one of: ${BIDDING_ZONES.slice(0, 8).map((entry) => entry.code).join(", ")}, ...`);
        if (!getEntsoeToken()) return ctx.fail("ENTSO-E token not configured.", `Set ${ENTSOE_TOKEN_ENV} or run ENTSOE in the terminal.`);
        const offset = args.includes("--tomorrow") ? 1 : args.includes("--yesterday") ? -1 : 0;
        const day = zoneDay(zone, offset);
        const bundle = await loadDayAhead(zone, day);
        const rows = bundle.data.points.map((point) => ({
          zone: zone.code,
          date: day.dateKey,
          start: new Date(point.ts).toISOString(),
          time: formatLocalTime(point.ts, zone.timeZone),
          price: point.value,
        }));
        const stats = priceStats(bundle.data.points, zone.timeZone);
        const money = (value: number | null) => (value == null ? "-" : value.toFixed(2));
        ctx.printResult(
          {
            data: rows,
            metadata: {
              zone: zone.code,
              date: day.dateKey,
              unit: bundle.data.unit,
              resolution: bundle.data.resolution,
              baseload: stats.baseload,
              peak: stats.peak,
              offPeak: stats.offPeak,
              fetchedAt: bundle.fetchedAt,
              stale: bundle.stale,
            },
          },
          {
            columns: [
              { key: "time", header: "Time" },
              { key: "price", header: bundle.data.unit, align: "right", value: (row) => money(row.price as number | null) },
            ],
            text: (data) => {
              const { cliStyles, renderSection, renderStat, renderTable } = ctx.output;
              if (data.length === 0) {
                return cliStyles.dim(`${zone.code} ${day.dateKey}: day-ahead prices not published yet.`);
              }
              return [
                renderSection(`${zone.name} day-ahead ${day.dateKey} (${bundle.data.unit}, ${bundle.data.resolution})`),
                renderStat("Baseload", money(stats.baseload)),
                renderStat("Peak", money(stats.peak)),
                renderStat("Off-peak", money(stats.offPeak)),
                renderStat("Min", stats.min ? `${money(stats.min.value)} @ ${formatLocalTime(stats.min.ts, zone.timeZone)}` : "-"),
                renderStat("Max", stats.max ? `${money(stats.max.value)} @ ${formatLocalTime(stats.max.ts, zone.timeZone)}` : "-"),
                "",
                renderTable(
                  [{ header: "Time" }, { header: bundle.data.unit, align: "right" }],
                  data.map((row) => [row.time, money(row.price)]),
                ),
              ].join("\n");
            },
          },
        );
      },
    },
  ],
};
