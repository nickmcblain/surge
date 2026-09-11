import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { linkHostPackages } from "./host-link";
import { pluginDirectoryNames } from "./plugin-names";

/**
 * A plugin is installed into a directory named after its repository and
 * declares sibling plugins by package name; both use the `surge-` prefix.
 */
describe("pluginDirectoryNames", () => {
  test("returns the declared name for a plugin package", () => {
    expect(pluginDirectoryNames("surge-ibkr")).toEqual(["surge-ibkr"]);
  });

  test("leaves a name that is neither alone", () => {
    expect(pluginDirectoryNames("react")).toEqual(["react"]);
  });
});

describe("linkPeerPlugins", () => {
  /** A plugins dir holding `peerDir`, plus a plugin that depends on `peerDep`. */
  function setup(peerDep: string, peerDir: string) {
    const root = mkdtempSync(join(tmpdir(), "surge-host-link-"));
    const hostRoot = join(root, "host");
    const pluginsDir = join(root, "plugins");
    const pluginDir = join(pluginsDir, "gateway");
    mkdirSync(hostRoot, { recursive: true });
    mkdirSync(join(pluginsDir, peerDir), { recursive: true });
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "package.json"),
      JSON.stringify({ name: "gateway", peerDependencies: { [peerDep]: ">=1.0.0" } }),
    );
    return { hostRoot, pluginsDir, pluginDir };
  }

  test("links a peer whose install directory uses the other product name", () => {
    const { hostRoot, pluginsDir, pluginDir } = setup("surge-ibkr", "surge-ibkr");

    const result = linkHostPackages(pluginDir, hostRoot, pluginsDir);

    // Named for the import specifier, pointing at the directory that exists.
    expect(result.linked).toContain("surge-ibkr");
    expect(readlinkSync(join(pluginDir, "node_modules", "surge-ibkr"))).toBe(
      join(pluginsDir, "surge-ibkr"),
    );
  });

  test("links a surge- peer, which the old prefix filter dropped", () => {
    const { hostRoot, pluginsDir, pluginDir } = setup("surge-ibkr", "surge-ibkr");

    const result = linkHostPackages(pluginDir, hostRoot, pluginsDir);

    expect(result.linked).toContain("surge-ibkr");
  });

  test("skips a peer that is not installed under either name", () => {
    const { hostRoot, pluginsDir, pluginDir } = setup("surge-ibkr", "unrelated");

    const result = linkHostPackages(pluginDir, hostRoot, pluginsDir);

    expect(result.linked).not.toContain("surge-ibkr");
  });
});
