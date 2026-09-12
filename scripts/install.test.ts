import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const installScript = join(import.meta.dir, "install.sh");

interface FakeMachine {
  /** What `uname -s` reports. */
  unameSystem: string;
  /** What `uname -m` reports. */
  unameMachine: string;
  /** `sysctl -n sysctl.proc_translated`, unset when the key does not exist. */
  procTranslated?: string;
  /** `sysctl -n hw.optional.arm64`, unset when the key does not exist. */
  hardwareArm64?: string;
  /** Opt into the unsigned desktop app via SURGE_DESKTOP=1. */
  desktop?: boolean;
}

interface InstallRun {
  exitCode: number;
  stdout: string;
  stderr: string;
  /** Every argument passed to the stubbed downloader, one per line. */
  downloadLog: string;
}

let workDir = "";

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "surge-install-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function writeStub(binDir: string, name: string, body: string) {
  const path = join(binDir, name);
  writeFileSync(path, `#!/bin/sh\n${body}`);
  chmodSync(path, 0o755);
}

/**
 * Runs the real install script against a fake machine. Downloads are stubbed
 * out and always fail, so the script never touches the network and the test
 * can assert on which asset it asked for.
 */
async function runInstall(machine: FakeMachine): Promise<InstallRun> {
  const binDir = join(workDir, "bin");
  const installDir = join(workDir, "install");
  const appDir = join(workDir, "Applications");
  const downloadLog = join(workDir, "downloads.log");
  mkdirSync(binDir, { recursive: true });
  mkdirSync(installDir, { recursive: true });
  mkdirSync(appDir, { recursive: true });

  writeStub(binDir, "uname", [
    'case "$1" in',
    '  -m) printf "%s\\n" "$FAKE_UNAME_MACHINE" ;;',
    '  *) printf "%s\\n" "$FAKE_UNAME_SYSTEM" ;;',
    "esac",
  ].join("\n"));

  writeStub(binDir, "sysctl", [
    '# Only -n <key> is used by the installer.',
    'case "$2" in',
    '  sysctl.proc_translated) value="$FAKE_PROC_TRANSLATED" ;;',
    '  hw.optional.arm64) value="$FAKE_HW_ARM64" ;;',
    '  *) value="" ;;',
    "esac",
    'if [ -z "$value" ]; then',
    '  echo "sysctl: unknown oid \'$2\'" >&2',
    "  exit 1",
    "fi",
    'printf "%s\\n" "$value"',
  ].join("\n"));

  writeStub(binDir, "curl", [
    'for arg in "$@"; do printf "%s\\n" "$arg" >> "$FAKE_DOWNLOAD_LOG"; done',
    "exit 22",
  ].join("\n"));

  writeStub(binDir, "wget", [
    'for arg in "$@"; do printf "%s\\n" "$arg" >> "$FAKE_DOWNLOAD_LOG"; done',
    "exit 8",
  ].join("\n"));

  const proc = Bun.spawn(["sh", installScript], {
    cwd: workDir,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
      SURGE_INSTALL_DIR: installDir,
      SURGE_APP_DIR: appDir,
      FAKE_UNAME_SYSTEM: machine.unameSystem,
      FAKE_UNAME_MACHINE: machine.unameMachine,
      FAKE_PROC_TRANSLATED: machine.procTranslated ?? "",
      FAKE_HW_ARM64: machine.hardwareArm64 ?? "",
      FAKE_DOWNLOAD_LOG: downloadLog,
      SURGE_DESKTOP: machine.desktop ? "1" : "0",
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return {
    exitCode,
    stdout,
    stderr,
    downloadLog: existsSync(downloadLog) ? readFileSync(downloadLog, "utf8") : "",
  };
}

describe("install.sh architecture detection", () => {
  // An Intel Mac used to get the arm64 app and only found out at launch, with
  // "Bad CPU type in executable". It gets the x64 terminal build, never the app.
  test("installs the x64 terminal build on a genuine Intel Mac", async () => {
    const run = await runInstall({
      unameSystem: "Darwin",
      unameMachine: "x86_64",
      desktop: true,
    });

    expect(run.downloadLog).toContain("surge-darwin-x64.gz");
    expect(run.downloadLog).not.toContain("stable-macos-arm64");
  });

  test("explains itself when a release ships no matching asset", async () => {
    const run = await runInstall({
      unameSystem: "Darwin",
      unameMachine: "x86_64",
    });

    expect(run.exitCode).not.toBe(0);
    expect(run.stderr).toContain("surge-darwin-x64.gz is not available");
    expect(run.stderr).toContain("https://github.com/nickmcblain/surge/releases");
  });

  // The desktop app is unsigned for now, so Apple Silicon defaults to the
  // terminal binary; the app is opt-in.
  test("installs the arm64 terminal build on an Apple Silicon Mac by default", async () => {
    const run = await runInstall({
      unameSystem: "Darwin",
      unameMachine: "arm64",
      hardwareArm64: "1",
    });

    expect(run.downloadLog).toContain("surge-darwin-arm64.gz");
    expect(run.downloadLog).not.toContain("stable-macos-arm64");
  });

  test("installs the arm64 app from a Rosetta shell when the desktop app is requested", async () => {
    const run = await runInstall({
      unameSystem: "Darwin",
      unameMachine: "x86_64",
      procTranslated: "1",
      desktop: true,
    });

    expect(run.downloadLog).toContain("stable-macos-arm64-Surge.app.zip");
  });

  test("installs the arm64 app on Apple Silicon when SURGE_DESKTOP=1", async () => {
    const run = await runInstall({
      unameSystem: "Darwin",
      unameMachine: "arm64",
      hardwareArm64: "1",
      desktop: true,
    });

    expect(run.downloadLog).toContain("stable-macos-arm64-Surge.app.zip");
  });

  test("installs the x64 binary on Linux", async () => {
    const run = await runInstall({
      unameSystem: "Linux",
      unameMachine: "x86_64",
    });

    expect(run.downloadLog).toContain("surge-linux-x64.gz");
  });

  test("installs the arm64 binary on Linux", async () => {
    const run = await runInstall({
      unameSystem: "Linux",
      unameMachine: "aarch64",
    });

    expect(run.downloadLog).toContain("surge-linux-arm64.gz");
  });

  test("rejects an unsupported operating system", async () => {
    const run = await runInstall({
      unameSystem: "FreeBSD",
      unameMachine: "x86_64",
    });

    expect(run.exitCode).not.toBe(0);
    expect(run.stderr).toContain("Unsupported OS: FreeBSD");
    expect(run.downloadLog).toBe("");
  });
});
