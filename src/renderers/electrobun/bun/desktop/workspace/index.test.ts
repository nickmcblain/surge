import { describe, expect, test } from "bun:test";
import { cloneLayout, createDefaultConfig } from "../../../../../types/config";
import { createResearchTestConfig } from "../../../../../test-support/research-layout";
import { createDesktopWorkspace } from "./index";

describe("desktop workspace", () => {
  test("popping out a pane persists it into the active layout", () => {
    const config = createResearchTestConfig("/tmp/surge-desktop");
    const workspace = createDesktopWorkspace(config, null);

    const snapshot = workspace.popOutPane("ticker-detail:main", {
      x: 100,
      y: 120,
      width: 800,
      height: 540,
    });

    expect(snapshot.config.layout.detached).toEqual([
      { instanceId: "ticker-detail:main", x: 100, y: 120, width: 800, height: 540 },
    ]);
    expect(snapshot.config.layouts[snapshot.config.activeLayoutIndex]?.layout.detached).toEqual([
      { instanceId: "ticker-detail:main", x: 100, y: 120, width: 800, height: 540 },
    ]);
    expect(snapshot.config.layout.floating.some((entry) => entry.instanceId === "ticker-detail:main")).toBe(false);
  });

  test("docking a detached pane onto a frame edge clears detached placement", () => {
    const config = createResearchTestConfig("/tmp/surge-desktop");
    const workspace = createDesktopWorkspace(config, null);
    workspace.popOutPane("ticker-detail:main", {
      x: 100,
      y: 120,
      width: 800,
      height: 540,
    });

    const snapshot = workspace.dockDetachedPane("ticker-detail:main", "left");

    expect(snapshot.config.layout.detached).toHaveLength(0);
    expect(snapshot.config.layout.dockRoot).not.toBeNull();
  });

  test("updating a detached frame rewrites the detached entry in-place", () => {
    const config = createResearchTestConfig("/tmp/surge-desktop");
    const workspace = createDesktopWorkspace(config, null);
    workspace.popOutPane("ticker-detail:main", {
      x: 100,
      y: 120,
      width: 800,
      height: 540,
    });

    const snapshot = workspace.updateDetachedFrame("ticker-detail:main", {
      x: 220,
      y: 260,
      width: 640,
      height: 480,
    });

    expect(snapshot.config.layout.detached).toEqual([
      { instanceId: "ticker-detail:main", x: 220, y: 260, width: 640, height: 480 },
    ]);
  });

  test("ignores main-window state that arrives behind a newer layout revision", () => {
    const config = createDefaultConfig("/tmp/surge-desktop-layout-revision");
    const workspace = createDesktopWorkspace(config, null);
    const initialSnapshot = workspace.getSnapshot();
    const monitorLayout = config.layouts[1]!;

    const newerSnapshot = {
      ...initialSnapshot,
      config: {
        ...initialSnapshot.config,
        layout: cloneLayout(monitorLayout.layout),
        activeLayoutIndex: 1,
      },
      paneState: monitorLayout.paneState ?? {},
      focusedPaneId: monitorLayout.focusedPaneId ?? null,
      activePanel: monitorLayout.activePanel ?? "left" as const,
      mainStateRevision: 2,
    };
    const staleSnapshot = {
      ...initialSnapshot,
      mainStateRevision: 1,
    };

    workspace.syncMainState(newerSnapshot);
    const result = workspace.syncMainState(staleSnapshot);

    expect(result.mainStateRevision).toBe(2);
    expect(result.config.activeLayoutIndex).toBe(1);
    expect(result.config.layout).toEqual(monitorLayout.layout);
  });
});
