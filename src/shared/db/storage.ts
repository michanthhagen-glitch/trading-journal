// File storage for the Trading Journal.
// In Tauri runtime: bytes go into the app data dir, paths come back relative.
// In browser fallback: bytes go into IndexedDB-backed Blob URLs (object URLs).

import { convertFileSrc } from "@tauri-apps/api/core";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const SCREENSHOTS_DIR = "screenshots";

export type CaptureWindowInfo = {
  id: number;
  appName: string;
  title: string;
  width: number;
  height: number;
  x: number;
  y: number;
  isFocused: boolean;
};

type CapturedWindowImage = {
  window: CaptureWindowInfo;
  pngBytes: number[];
};

function todayBucket(): string {
  return new Date().toISOString().slice(0, 10);
}

function uuid(): string {
  // Browser-native UUID v4
  return crypto.randomUUID();
}

/**
 * Save raw bytes (a PNG / JPEG image) into app storage.
 * Returns a storage key the rest of the app uses to look it up.
 */
export async function saveScreenshotBytes(
  bytes: Uint8Array,
  ext: "png" | "jpg" | "jpeg" = "png",
): Promise<string> {
  const filename = `${uuid()}.${ext === "jpg" ? "jpg" : ext}`;
  const relPath = `${SCREENSHOTS_DIR}/${todayBucket()}/${filename}`;

  if (!isTauri()) {
    const blob = new Blob([new Uint8Array(bytes)], {
      type: ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png",
    });
    const url = URL.createObjectURL(blob);
    memoryBlobs.set(relPath, url);
    return relPath;
  }

  const { writeFile, mkdir, exists } = await import("@tauri-apps/plugin-fs");
  const { BaseDirectory, join } = await import("@tauri-apps/api/path");

  // Ensure .../screenshots/YYYY-MM-DD/ exists
  const dirRel = `${SCREENSHOTS_DIR}/${todayBucket()}`;
  const dirExists = await exists(dirRel, { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir(dirRel, {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  }

  await writeFile(relPath, bytes, {
    baseDir: BaseDirectory.AppData,
  });
  return relPath;
}

/**
 * Copy a file from the user's disk (path returned by the file picker) into
 * app storage and return the storage key.
 */
export async function importScreenshotFromPath(
  srcPath: string,
): Promise<string> {
  if (!isTauri()) {
    throw new Error("File import is only available in the desktop app.");
  }
  const { readFile } = await import("@tauri-apps/plugin-fs");
  const bytes = await readFile(srcPath);
  const extMatch = srcPath.match(/\.(png|jpg|jpeg)$/i);
  const ext = extMatch
    ? (extMatch[1].toLowerCase() as "png" | "jpg" | "jpeg")
    : "png";
  return saveScreenshotBytes(bytes, ext);
}

/**
 * Read a clipboard image (TradingView chart screenshot) and store it.
 * Returns null if the clipboard doesn't contain an image.
 */
export async function importScreenshotFromClipboard(): Promise<string | null> {
  if (!isTauri()) {
    return null;
  }
  const clipboard = await import("@tauri-apps/plugin-clipboard-manager");
  const img = await clipboard.readImage();
  if (!img) return null;
  // Tauri's readImage returns an Image object with size() and rgba() methods.
  const size = await img.size();
  const rgba = await img.rgba();
  const png = await encodePngFromRgba({
    rgba,
    width: size.width,
    height: size.height,
  });
  return saveScreenshotBytes(png, "png");
}

export async function captureTradingViewScreenshot(): Promise<string | null> {
  if (!isTauri()) {
    return null;
  }

  const { invoke } = await import("@tauri-apps/api/core");
  try {
    const captured = await invoke<CapturedWindowImage>(
      "capture_tradingview_window",
    );
    return saveScreenshotBytes(new Uint8Array(captured.pngBytes), "png");
  } catch (error) {
    if (String(error).includes("TRADINGVIEW_NOT_FOUND")) {
      return null;
    }
    throw error;
  }
}

export async function listCaptureWindows(): Promise<CaptureWindowInfo[]> {
  if (!isTauri()) {
    return [];
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<CaptureWindowInfo[]>("list_capture_windows");
}

export async function captureWindowScreenshot(
  windowId: number,
): Promise<string> {
  if (!isTauri()) {
    throw new Error("Window capture is only available in the desktop app.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  const captured = await invoke<CapturedWindowImage>("capture_window_by_id", {
    windowId,
  });
  return saveScreenshotBytes(new Uint8Array(captured.pngBytes), "png");
}

async function encodePngFromRgba(img: {
  rgba: number[] | Uint8Array;
  width: number;
  height: number;
}): Promise<Uint8Array> {
  // Lightweight PNG encoder using OffscreenCanvas/Canvas.
  const { width, height } = img;
  const rgba =
    img.rgba instanceof Uint8Array ? img.rgba : new Uint8Array(img.rgba);
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
    ctx.putImageData(imageData, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return new Uint8Array(await blob.arrayBuffer());
  }
  // Fallback for older WebViews: use a regular <canvas>
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
  ctx.putImageData(imageData, 0, 0);
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png"),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Resolve a storage key to a URL the browser can use in <img src>.
 * In Tauri: convertFileSrc with the absolute path.
 * In browser fallback: a blob URL we stashed earlier.
 */
export async function resolveScreenshotUrl(relPath: string): Promise<string> {
  if (!isTauri()) {
    return memoryBlobs.get(relPath) ?? "";
  }
  const { BaseDirectory, join } = await import("@tauri-apps/api/path");
  const absPath = await join(await appDataDir(), relPath);
  return convertFileSrc(absPath);
}

async function appDataDir(): Promise<string> {
  const { BaseDirectory, appDataDir: dir } =
    await import("@tauri-apps/api/path");
  // appDataDir() resolves to the absolute path; passing BaseDirectory separately
  // for writeFile is enough for filesystem ops.
  return dir();
}

/**
 * Delete a screenshot file from app storage.
 * Does not touch the DB — caller handles the row removal.
 */
export async function deleteScreenshotFile(relPath: string): Promise<void> {
  if (!isTauri()) {
    const blob = memoryBlobs.get(relPath);
    if (blob) URL.revokeObjectURL(blob);
    memoryBlobs.delete(relPath);
    return;
  }
  const { remove } = await import("@tauri-apps/plugin-fs");
  const { BaseDirectory } = await import("@tauri-apps/api/path");
  try {
    await remove(relPath, { baseDir: BaseDirectory.AppData });
  } catch {
    // Best effort — file may already be gone.
  }
}

// --------- Browser fallback memory store ---------
const memoryBlobs = new Map<string, string>();
