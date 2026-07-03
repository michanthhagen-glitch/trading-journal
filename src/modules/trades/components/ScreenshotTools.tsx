import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  addScreenshot,
  deleteScreenshot,
  type ScreenshotRow,
} from "../../../shared/db/database";
import {
  captureTradingViewScreenshot,
  captureWindowScreenshot,
  type CaptureWindowInfo,
  deleteScreenshotFile,
  importScreenshotFromPath,
  listCaptureWindows,
  resolveScreenshotUrl,
  saveScreenshotBytes,
} from "../../../shared/db/storage";

type ScreenshotStage = ScreenshotRow["stage"];

export type DraftScreenshot = {
  id: string;
  stage: ScreenshotStage;
  path: string;
  caption: string;
};

type ScreenshotImportButtonProps = {
  tradeId: string;
  stage: ScreenshotStage;
  onChanged: () => void | Promise<void>;
};

type DraftScreenshotImportButtonProps = {
  stage: ScreenshotStage;
  onImported: (path: string) => void | Promise<void>;
};

type ScreenshotFileImportControlProps = {
  label: string;
  onImported: (path: string) => void | Promise<void>;
};

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function imageExt(name: string): "png" | "jpg" | "jpeg" {
  const match = name.match(/\.(png|jpg|jpeg)$/i);
  return match ? (match[1].toLowerCase() as "png" | "jpg" | "jpeg") : "png";
}

function stageLabel(stage: ScreenshotStage): string {
  switch (stage) {
    case "pre-trade":
      return "Pre-trade";
    case "entry":
      return "Entry";
    case "exit":
      return "Exit";
    case "recap":
      return "Recap";
  }
}

export function ScreenshotImportButton({
  tradeId,
  stage,
  onChanged,
}: ScreenshotImportButtonProps) {
  async function savePath(relPath: string) {
    await addScreenshot(tradeId, stage, relPath);
    await onChanged();
  }

  return (
    <ScreenshotFileImportControl
      label={`Import ${stageLabel(stage)} screenshot`}
      onImported={savePath}
    />
  );
}

export function DraftScreenshotImportButton({
  stage,
  onImported,
}: DraftScreenshotImportButtonProps) {
  return (
    <ScreenshotFileImportControl
      label={`Import ${stageLabel(stage)} screenshot`}
      onImported={onImported}
    />
  );
}

function ScreenshotFileImportControl({
  label,
  onImported,
}: ScreenshotFileImportControlProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectorWindows, setSelectorWindows] = useState<
    CaptureWindowInfo[] | null
  >(null);

  async function importFromDisk() {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const picked = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }],
    });
    if (!picked || typeof picked !== "string") return;
    const relPath = await importScreenshotFromPath(picked);
    await onImported(relPath);
  }

  async function handleClick() {
    if (importing) return;

    if (!isTauri()) {
      inputRef.current?.click();
      return;
    }

    setImporting(true);
    try {
      const capturedPath = await captureTradingViewScreenshot();
      if (capturedPath) {
        await onImported(capturedPath);
        return;
      }

      const windows = await listCaptureWindows();
      if (windows.length > 0) {
        setSelectorWindows(windows);
        return;
      }

      await importFromDisk();
    } catch (error) {
      console.error(error);
      try {
        await importFromDisk();
      } catch (fallbackError) {
        console.error(fallbackError);
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setImporting(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const relPath = await saveScreenshotBytes(bytes, imageExt(file.name));
      await onImported(relPath);
    } catch (error) {
      console.error(error);
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <button
        className="screenshot-import-button"
        type="button"
        aria-label={label}
        title={label}
        onClick={handleClick}
        disabled={importing}
      >
        <Plus size={18} aria-hidden="true" />
      </button>
      <input
        ref={inputRef}
        className="screenshot-file-input"
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileChange}
      />
      {selectorWindows ? (
        <WindowSelectorModal
          windows={selectorWindows}
          onCancel={() => setSelectorWindows(null)}
          onImportFallback={async () => {
            try {
              await importFromDisk();
              setSelectorWindows(null);
            } catch (error) {
              console.error(error);
            }
          }}
          onSelect={async (windowId) => {
            setImporting(true);
            try {
              const relPath = await captureWindowScreenshot(windowId);
              await onImported(relPath);
              setSelectorWindows(null);
            } catch (error) {
              console.error(error);
              try {
                await importFromDisk();
                setSelectorWindows(null);
              } catch (fallbackError) {
                console.error(fallbackError);
              }
            } finally {
              setImporting(false);
            }
          }}
        />
      ) : null}
    </>
  );
}

type WindowSelectorModalProps = {
  windows: CaptureWindowInfo[];
  onCancel: () => void;
  onImportFallback: () => void | Promise<void>;
  onSelect: (windowId: number) => void | Promise<void>;
};

function WindowSelectorModal({
  windows,
  onCancel,
  onImportFallback,
  onSelect,
}: WindowSelectorModalProps) {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Select screenshot window"
      onClick={onCancel}
    >
      <div
        className="modal-card window-selector-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3>Select window</h3>
            <p className="modal-subtitle">TradingView was not found.</p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={onCancel}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body window-selector-body">
          {windows.map((window) => (
            <button
              key={window.id}
              type="button"
              className="window-selector-row"
              onClick={() => onSelect(window.id)}
            >
              <span className="window-selector-title">
                {window.title || window.appName}
              </span>
              <span className="window-selector-meta">
                {window.appName || "Window"} · {window.width}x{window.height}
                {window.isFocused ? " · Active" : ""}
              </span>
            </button>
          ))}
        </div>
        <footer className="modal-footer">
          <button type="button" className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onImportFallback}
          >
            Import file
          </button>
        </footer>
      </div>
    </div>
  );
}

type DraftScreenshotGalleryProps = {
  screenshots: DraftScreenshot[];
  onDelete: (id: string) => void | Promise<void>;
};

export function DraftScreenshotGallery({
  screenshots,
  onDelete,
}: DraftScreenshotGalleryProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<DraftScreenshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (screenshots.length === 0) {
      setUrls({});
      return () => {
        cancelled = true;
      };
    }

    Promise.all(
      screenshots.map(async (screenshot) => [
        screenshot.id,
        await resolveScreenshotUrl(screenshot.path),
      ]),
    ).then((pairs) => {
      if (cancelled) return;
      setUrls(Object.fromEntries(pairs as [string, string][]));
    });

    return () => {
      cancelled = true;
    };
  }, [screenshots]);

  async function handleDelete(screenshot: DraftScreenshot) {
    await deleteScreenshotFile(screenshot.path);
    if (lightbox?.id === screenshot.id) setLightbox(null);
    await onDelete(screenshot.id);
  }

  return (
    <>
      <div className="screenshot-gallery">
        {screenshots.map((screenshot) => (
          <div className="screenshot-thumb" key={screenshot.id}>
            <button
              type="button"
              className="screenshot-thumb-button"
              onClick={() => setLightbox(screenshot)}
              aria-label="Open screenshot"
            >
              {urls[screenshot.id] ? (
                <img
                  src={urls[screenshot.id]}
                  alt={
                    screenshot.caption ||
                    `${stageLabel(screenshot.stage)} screenshot`
                  }
                />
              ) : (
                <span className="screenshot-loading">Loading...</span>
              )}
            </button>
            <button
              type="button"
              className="screenshot-delete"
              aria-label="Delete screenshot"
              onClick={() => handleDelete(screenshot)}
            >
              x
            </button>
          </div>
        ))}
      </div>

      {lightbox ? (
        <ScreenshotLightbox
          screenshot={lightbox}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}

type TradeScreenshotGalleryProps = {
  screenshots: ScreenshotRow[];
  onChanged: () => void | Promise<void>;
};

export function TradeScreenshotGallery({
  screenshots,
  onChanged,
}: TradeScreenshotGalleryProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<ScreenshotRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (screenshots.length === 0) {
      setUrls({});
      return () => {
        cancelled = true;
      };
    }

    Promise.all(
      screenshots.map(async (screenshot) => [
        screenshot.id,
        await resolveScreenshotUrl(screenshot.path),
      ]),
    ).then((pairs) => {
      if (cancelled) return;
      setUrls(Object.fromEntries(pairs as [string, string][]));
    });

    return () => {
      cancelled = true;
    };
  }, [screenshots]);

  async function handleDelete(screenshot: ScreenshotRow) {
    await deleteScreenshot(screenshot.id, screenshot.path);
    await deleteScreenshotFile(screenshot.path);
    if (lightbox?.id === screenshot.id) setLightbox(null);
    await onChanged();
  }

  return (
    <>
      <div className="screenshot-gallery">
        {screenshots.map((screenshot) => (
          <div className="screenshot-thumb" key={screenshot.id}>
            <button
              type="button"
              className="screenshot-thumb-button"
              onClick={() => setLightbox(screenshot)}
              aria-label="Open screenshot"
            >
              {urls[screenshot.id] ? (
                <img
                  src={urls[screenshot.id]}
                  alt={
                    screenshot.caption ||
                    `${stageLabel(screenshot.stage)} screenshot`
                  }
                />
              ) : (
                <span className="screenshot-loading">Loading...</span>
              )}
            </button>
            <button
              type="button"
              className="screenshot-delete"
              aria-label="Delete screenshot"
              onClick={() => handleDelete(screenshot)}
            >
              x
            </button>
          </div>
        ))}
      </div>

      {lightbox ? (
        <ScreenshotLightbox
          screenshot={lightbox}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}

function ScreenshotLightbox({
  screenshot,
  onClose,
}: {
  screenshot: ScreenshotRow | DraftScreenshot;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    resolveScreenshotUrl(screenshot.path).then(setUrl);
  }, [screenshot.path]);

  return (
    <div className="lightbox-backdrop" onClick={onClose} role="dialog">
      <img
        className="lightbox-image"
        src={url}
        alt={screenshot.caption || "Screenshot"}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
