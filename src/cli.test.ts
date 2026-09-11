import { describe, expect, test } from "bun:test";
import {
  buildSearchReport,
  searchCandidatesForCli,
} from "./cli/index";
import type { TickerRecord } from "./types/ticker";
import { createTestDataProvider } from "./test-support/data-provider";

function makeTicker(overrides: Partial<TickerRecord["metadata"]> = {}): TickerRecord {
  return {
    metadata: {
      ticker: "NVDA",
      exchange: "NASDAQ",
      currency: "USD",
      name: "NVIDIA Corporation",
      portfolios: [],
      watchlists: [],
      positions: [],
      custom: {},
      tags: [],
      ...overrides,
    },
  };
}

describe("CLI search helpers", () => {
  test("merges local ticker matches with provider company search results", async () => {
    const candidates = await searchCandidatesForCli({
      query: "micro",
      tickers: [
        makeTicker({
          ticker: "MSFT",
          name: "Microsoft Corporation",
          exchange: "NASDAQ",
          assetCategory: "STK",
        }),
      ],
      dataProvider: createTestDataProvider({
        search: async () => [{
          providerId: "yahoo",
          symbol: "MSTR",
          name: "MicroStrategy Incorporated",
          exchange: "NASDAQ",
          type: "EQUITY",
          currency: "USD",
        }],
      }),
    });

    expect(candidates.some((candidate) => candidate.label === "MSFT")).toBe(true);
    expect(candidates.some((candidate) => candidate.label === "MSTR")).toBe(true);

    const report = buildSearchReport({
      query: "micro",
      candidates,
    });

    expect(report).toContain("Search: micro");
    expect(report).toContain("MSFT");
    expect(report).toContain("Microsoft Corporation");
    expect(report).toContain("MSTR");
    expect(report).toContain("MicroStrategy Incorporated");
    expect(report).toContain("Saved");
    expect(report).toContain("yahoo");
  });

  test("renders an empty state when no search results match", () => {
    const report = buildSearchReport({
      query: "zzzz",
      candidates: [],
    });

    expect(report).toContain("Search: zzzz");
    expect(report).toContain("No matches found.");
  });
});
