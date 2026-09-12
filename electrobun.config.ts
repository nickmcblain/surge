import type { ElectrobunConfig } from "electrobun/bun";
import pkg from "./package.json";

const RELEASE_BASE_URL = "https://github.com/nickmcblain/surge/releases/latest/download";
const GENERATE_RELEASE_PATCH = process.platform !== "win32";
// Sign and notarize only when a Developer ID is configured; otherwise produce an
// unsigned preview build so releases work without an Apple Developer account.
const APPLE_SIGNING = Boolean(process.env.ELECTROBUN_DEVELOPER_ID);

const config: ElectrobunConfig = {
  app: {
    name: "Surge",
    identifier: "dev.surge.terminal",
    version: pkg.version,
    description: pkg.description,
    urlSchemes: ["surge"],
  },
  build: {
    bun: {
      entrypoint: "src/renderers/electrobun/bun/index.ts",
      sourcemap: "external",
    },
    copy: {
      "dist/electrobun-view": "views/mainview",
    },
    watch: [
      "src",
      "scripts/build-electrobun-view.ts",
      "electrobun.config.ts",
      "package.json",
    ],
    watchIgnore: [
      ".git",
      ".git/**",
      "dist/**",
      "build/**",
      "artifacts/**",
      "node_modules/**",
    ],
    mac: {
      codesign: APPLE_SIGNING,
      createDmg: true,
      notarize: APPLE_SIGNING,
      icons: "icon.iconset",
      defaultRenderer: "native",
    },
    win: {
      bundleCEF: true,
      defaultRenderer: "cef",
      icon: "src/assets/surge-logo-windows.ico",
    },
  },
  scripts: {
    preBuild: "scripts/build-electrobun-view.ts",
    postBuild: "scripts/install-electrobun-tui-shim.ts",
    postWrap: "",
    postPackage: "",
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
  release: {
    baseUrl: RELEASE_BASE_URL,
    generatePatch: GENERATE_RELEASE_PATCH,
  },
};

export default config;
