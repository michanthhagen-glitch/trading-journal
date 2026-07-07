import { describe, expect, it } from "vitest";
import {
  isPointInsideScreenshotDropRect,
  isSupportedScreenshotFilePath,
} from "../src/modules/trades/components/ScreenshotTools";

describe("screenshot drop helpers", () => {
  it("accepts image paths from native desktop drops", () => {
    expect(isSupportedScreenshotFilePath("C:\\charts\\exit.PNG")).toBe(true);
    expect(isSupportedScreenshotFilePath("D:\\charts\\entry.jpeg")).toBe(true);
    expect(isSupportedScreenshotFilePath("D:\\charts\\notes.txt")).toBe(false);
  });

  it("matches native drop points to the drop zone bounds", () => {
    const rect = { bottom: 150, left: 100, right: 300, top: 50 };

    expect(isPointInsideScreenshotDropRect({ x: 120, y: 80 }, rect)).toBe(true);
    expect(isPointInsideScreenshotDropRect({ x: 240, y: 160 }, rect, 2)).toBe(
      true,
    );
    expect(isPointInsideScreenshotDropRect({ x: 80, y: 80 }, rect)).toBe(false);
  });
});
