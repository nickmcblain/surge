import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { seedExtractedPlugins, type ExtractedPlugin } from "./seed";
import type { AppConfig } from "../types/config";

/**
 * Extracting a built-in plugin is the one change here that can quietly take a
 * working feature away from an existing user, so the seeding rules are worth
 * pinning: restore it once, never fight a deliberate removal, and never record
 * a failure as done — being offline at startup is common, and marking it seeded
 * would drop the plugin permanently.
 */
const ENTRIES: readonly ExtractedPlugin[] = [
  { id: "tv", repo: "example/surge-tv", directory: "surge-tv", previousOwnerIds: ["macro", "macro-tv"] },
  { id: "substack", repo: "example/surge-substack", directory: "surge-substack" },
];

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return { disabledPlugins: [], seededPlugins: [], ...overrides } as AppConfig;
}

async function seed(cfg: AppConfig, installPlugin: (ref: string) => Promise<void>, prepare?: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "surge-seed-"));
  try {
    prepare?.(dir);
    return await seedExtractedPlugins(cfg, installPlugin, dir, ENTRIES);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("seedExtractedPlugins", () => {
  test("installs an extracted plugin the user has not seen", async () => {
    const installs: string[] = [];
    const result = await seed(config(), async (ref) => { installs.push(ref); });

    expect(installs).toEqual(ENTRIES.map((entry) => entry.repo));
    expect(result.installed).toEqual(ENTRIES.map((entry) => entry.id));
    expect(result.seeded).toEqual(ENTRIES.map((entry) => entry.id));
  });

  test("does nothing once a plugin has been seeded", async () => {
    const installs: string[] = [];
    await seed(config({ seededPlugins: ENTRIES.map((entry) => entry.id) }), async (ref) => { installs.push(ref); });

    expect(installs).toEqual([]);
  });

  test("respects a plugin the user disabled before the move", async () => {
    const installs: string[] = [];
    const result = await seed(config({ disabledPlugins: ["substack"] }), async (ref) => { installs.push(ref); });

    expect(installs).not.toContain("example/surge-substack");
    // Recorded, so we stop asking rather than retrying every launch.
    expect(result.seeded).toContain("substack");
  });

  test("records a plugin that is already installed without reinstalling it", async () => {
    const installs: string[] = [];
    const result = await seed(config(), async (ref) => { installs.push(ref); }, (dir) => {
      mkdirSync(join(dir, "surge-substack"), { recursive: true });
    });

    expect(installs).not.toContain("example/surge-substack");
    expect(result.seeded).toContain("substack");
  });

  test("keeps TV disabled when its former Macro owner was disabled", async () => {
    for (const owner of ["macro", "macro-tv", "tv"]) {
      const installs: string[] = [];
      const result = await seed(config({ disabledPlugins: [owner] }), async (ref) => { installs.push(ref); });
      expect(installs).not.toContain("example/surge-tv");
      expect(result.seeded).toContain("tv");
    }
  });

  test("retries next launch instead of recording a failed install", async () => {
    const result = await seed(config(), async () => { throw new Error("offline"); });

    expect(result.failed).toContain("substack");
    expect(result.seeded).not.toContain("substack");
  });
});
