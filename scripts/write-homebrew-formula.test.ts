import { describe, expect, test } from "bun:test";
import { renderFormula } from "./write-homebrew-formula";

const SHA = "a".repeat(64);

describe("write-homebrew-formula", () => {
  test("emits one url/sha256 pair per platform it has a digest for", () => {
    const formula = renderFormula({
      version: "1.2.3",
      digests: new Map([["surge-darwin-arm64", SHA], ["surge-linux-x64", "b".repeat(64)]]),
    });

    expect(formula).toContain('version "1.2.3"');
    expect(formula).toContain('url "https://github.com/nickmcblain/surge/releases/download/v#{version}/surge-darwin-arm64.gz"');
    expect(formula).toContain('url "https://github.com/nickmcblain/surge/releases/download/v#{version}/surge-linux-x64.gz"');
    expect(formula).toContain(`sha256 "${"b".repeat(64)}"`);
    // Platforms without a digest are omitted rather than rendered with a placeholder.
    expect(formula).not.toContain("surge-darwin-x64");
    expect(formula).not.toContain("on_intel do\n    end");
  });

  test("installs whichever platform binary was unpacked as the surge command", () => {
    const formula = renderFormula({ version: "1.2.3", digests: new Map([["surge-darwin-arm64", SHA]]) });
    expect(formula).toContain('bin.install Dir["surge-*"].first => "surge"');
    expect(formula).not.toContain("on_linux");
  });
});
