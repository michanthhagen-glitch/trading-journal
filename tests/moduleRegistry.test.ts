import { describe, expect, it } from "vitest";
import { appModules } from "../src/app/moduleRegistry";

describe("module registry", () => {
  it("keeps the expected sidebar modules in direct navigation order", () => {
    expect(appModules.map((module) => module.id)).toEqual([
      "dashboard",
      "trades",
      "recaps",
      "account",
      "settings",
    ]);
  });
});
