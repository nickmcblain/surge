import { dirname } from "path";
import { mkdirSync, writeFileSync } from "fs";

/**
 * Renders the Homebrew formula for the standalone `surge` terminal binary.
 *
 * A formula rather than a cask because the desktop app is not signed or
 * notarized yet; a cask for an unsigned app would install something Gatekeeper
 * refuses to open. The formula ships the same `surge-<os>-<arch>.gz` assets the
 * curl installer uses, one per platform, and only emits the platforms it was
 * given a digest for.
 */

const REPO = "nickmcblain/surge";

const TARGETS = [
  { flag: "--sha256-darwin-arm64", asset: "surge-darwin-arm64", os: "macos", arch: "arm" },
  { flag: "--sha256-darwin-x64", asset: "surge-darwin-x64", os: "macos", arch: "intel" },
  { flag: "--sha256-linux-arm64", asset: "surge-linux-arm64", os: "linux", arch: "arm" },
  { flag: "--sha256-linux-x64", asset: "surge-linux-x64", os: "linux", arch: "intel" },
] as const;

type Target = (typeof TARGETS)[number];

interface Options {
  version: string;
  output: string;
  digests: Map<Target["asset"], string>;
}

function readOptions(argv: string[]): Options {
  const options: { version?: string; output?: string; digests: Map<Target["asset"], string> } = { digests: new Map() };

  for (let i = 0; i < argv.length; i += 2) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (!value) throw new Error(`Missing value for ${arg}`);
    if (arg === "--version") {
      options.version = value;
      continue;
    }
    if (arg === "--output") {
      options.output = value;
      continue;
    }
    const target = TARGETS.find((entry) => entry.flag === arg);
    if (!target) throw new Error(`Unknown argument: ${arg}`);
    if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(`${arg} must be a lowercase SHA-256 digest`);
    options.digests.set(target.asset, value);
  }

  if (!options.version || !/^\d+\.\d+\.\d+$/.test(options.version)) {
    throw new Error("--version must be in X.Y.Z format");
  }
  if (!options.output) throw new Error("--output is required");
  if (options.digests.size === 0) throw new Error("At least one --sha256-<os>-<arch> digest is required");

  return options as Options;
}

function renderPlatform(os: Target["os"], digests: Options["digests"]): string {
  const blocks = TARGETS
    .filter((target) => target.os === os && digests.has(target.asset))
    .map((target) => [
      `    on_${target.arch} do`,
      `      url "https://github.com/${REPO}/releases/download/v#{version}/${target.asset}.gz"`,
      `      sha256 "${digests.get(target.asset)}"`,
      "    end",
    ].join("\n"));
  if (blocks.length === 0) return "";
  return [`  on_${os} do`, ...blocks, "  end", ""].join("\n");
}

export function renderFormula({ version, digests }: Pick<Options, "version" | "digests">): string {
  return `class Surge < Formula
  desc "Open-source energy markets terminal for power and gas traders"
  homepage "https://github.com/${REPO}"
  version "${version}"
  license "MIT"

${renderPlatform("macos", digests)}${renderPlatform("linux", digests)}
  def install
    # Each asset is a gzipped single binary named after its platform.
    bin.install Dir["surge-*"].first => "surge"
  end

  test do
    system bin/"surge", "help"
  end
end
`;
}

if (import.meta.main) {
  const options = readOptions(process.argv.slice(2));
  mkdirSync(dirname(options.output), { recursive: true });
  writeFileSync(options.output, renderFormula(options));
}
