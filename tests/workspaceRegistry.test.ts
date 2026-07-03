import { describe, expect, it } from "vitest";
import { workspaceModules, workspaceSections } from "../src/app/moduleRegistry";

describe("workspace registry", () => {
  it("keeps the expected sidebar workspaces in one section", () => {
    expect(workspaceModules.map((module) => module.id)).toEqual([
      "dashboard",
      "account",
      "trades",
      "journal",
      "settings",
    ]);
    expect(workspaceSections).toHaveLength(1);
    expect(workspaceSections[0].modules).toBe(workspaceModules);
  });
});
