import { describe, expect, it } from "vitest";
import {
  isPointInsideScreenshotDropRect,
  isSupportedScreenshotFilePath,
  selectableCaptureWindows,
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

  it("offers other app windows without offering MethodMark itself", () => {
    const windows = selectableCaptureWindows([
      {
        id: 1,
        appName: "MethodMark Dev",
        title: "MethodMark Dev",
        width: 1440,
        height: 900,
        x: 0,
        y: 0,
        isFocused: true,
        isMinimized: false,
      },
      {
        id: 2,
        appName: "Google Chrome",
        title: "XAUUSD chart",
        width: 1920,
        height: 1080,
        x: 0,
        y: 0,
        isFocused: false,
        isMinimized: false,
      },
      {
        id: 3,
        appName: "TradingView",
        title: "Backtest",
        width: 160,
        height: 28,
        x: -32000,
        y: -32000,
        isFocused: false,
        isMinimized: true,
      },
    ]);

    expect(windows.map((window) => window.appName)).toEqual([
      "Google Chrome",
      "TradingView",
    ]);
    expect(windows[1].isMinimized).toBe(true);
  });
});
