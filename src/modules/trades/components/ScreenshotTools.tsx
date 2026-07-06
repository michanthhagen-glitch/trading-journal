import { Plus } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ModalShell } from "../../../components/ModalShell";
import {
  addScreenshot,
  deleteScreenshot,
  type ScreenshotRow,
} from "../../../shared/db/database";
import {
  captureTradingViewScreenshot,
  deleteScreenshotFile,
  importScreenshotFromClipboard,
  importScreenshotFromPath,
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

type ScreenshotDropZoneFrameProps = {
  busyMessage: string | null;
  children: ReactNode;
  emptyMessage: string;
  isDragging: boolean;
  label: string;
  stage: ScreenshotStage;
  statusMessage: string | null;
  onBlur: () => void;
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFocus: () => void;
  onPaste: (event: ClipboardEvent<HTMLDivElement>) => void;
};

type ScreenshotDropZoneController = {
  busyMessage: string | null;
  isDragging: boolean;
  statusMessage: string | null;
  dropZoneHandlers: Pick<
    ScreenshotDropZoneFrameProps,
    | "onBlur"
    | "onClick"
    | "onDragLeave"
    | "onDragOver"
    | "onDrop"
    | "onFocus"
    | "onPaste"
  >;
};

type DraftScreenshotImportButtonProps = {
  stage: ScreenshotStage;
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

export function TradeScreenshotDropZone({
  confirmBeforeDelete,
  screenshots,
  stage,
  tradeId,
  onChanged,
}: {
  confirmBeforeDelete: boolean;
  screenshots: ScreenshotRow[];
  stage: ScreenshotStage;
  tradeId: string;
  onChanged: () => void | Promise<void>;
}) {
  const [localScreenshots, setLocalScreenshots] =
    useState<ScreenshotRow[]>(screenshots);
  const controller = useScreenshotDropZone(stage, async (relPath) => {
    const row = await addScreenshot(tradeId, stage, relPath);
    setLocalScreenshots((current) => [...current, row]);
    await onChanged();
  });

  useEffect(() => {
    setLocalScreenshots(screenshots);
  }, [screenshots]);

  return (
    <ScreenshotDropZoneFrame
      {...controller.dropZoneHandlers}
      busyMessage={controller.busyMessage}
      emptyMessage="Drop image here, or select this box and paste."
      isDragging={controller.isDragging}
      label={`Add ${stageLabel(stage)} screenshot`}
      stage={stage}
      statusMessage={controller.statusMessage}
    >
      {localScreenshots.length > 0 ? (
        <TradeScreenshotGallery
          confirmBeforeDelete={confirmBeforeDelete}
          screenshots={localScreenshots}
          onChanged={onChanged}
          onDeleted={(id) =>
            setLocalScreenshots((current) =>
              current.filter((screenshot) => screenshot.id !== id),
            )
          }
        />
      ) : null}
    </ScreenshotDropZoneFrame>
  );
}

export function DraftScreenshotImportButton({
  stage,
  onImported,
}: DraftScreenshotImportButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

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

  const label = `Import ${stageLabel(stage)} screenshot`;

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
    </>
  );
}

function useScreenshotDropZone(
  stage: ScreenshotStage,
  onImported: (path: string) => void | Promise<void>,
): ScreenshotDropZoneController {
  const [isDragging, setIsDragging] = useState(false);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function clearStatusSoon() {
    window.setTimeout(() => setStatusMessage(null), 2400);
  }

  async function importFiles(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setStatusMessage("No image found.");
      clearStatusSoon();
      return;
    }

    setBusyMessage("Adding screenshot...");
    setStatusMessage(null);
    try {
      for (const file of imageFiles) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const relPath = await saveScreenshotBytes(bytes, imageExt(file.name));
        await onImported(relPath);
      }
      setStatusMessage(
        imageFiles.length === 1
          ? `${stageLabel(stage)} screenshot added.`
          : `${imageFiles.length} screenshots added.`,
      );
      clearStatusSoon();
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not add screenshot.");
      clearStatusSoon();
    } finally {
      setBusyMessage(null);
      setIsDragging(false);
    }
  }

  async function importFromClipboard(event: ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(event.clipboardData.files);
    const itemFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    const clipboardFiles = files.length > 0 ? files : itemFiles;

    if (clipboardFiles.length > 0) {
      event.preventDefault();
      await importFiles(clipboardFiles);
      return;
    }

    if (!isTauri()) {
      setStatusMessage("No image found on clipboard.");
      clearStatusSoon();
      return;
    }

    event.preventDefault();
    setBusyMessage("Reading clipboard...");
    try {
      const relPath = await importScreenshotFromClipboard();
      if (!relPath) {
        setStatusMessage("No image found on clipboard.");
        clearStatusSoon();
        return;
      }
      await onImported(relPath);
      setStatusMessage(`${stageLabel(stage)} screenshot added.`);
      clearStatusSoon();
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not read clipboard image.");
      clearStatusSoon();
    } finally {
      setBusyMessage(null);
    }
  }

  return {
    busyMessage,
    isDragging,
    statusMessage,
    dropZoneHandlers: {
      onBlur: () => setIsDragging(false),
      onClick: (event) => event.currentTarget.focus(),
      onDragLeave: (event) => {
        event.preventDefault();
        setIsDragging(false);
      },
      onDragOver: (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setIsDragging(true);
      },
      onDrop: async (event) => {
        event.preventDefault();
        await importFiles(Array.from(event.dataTransfer.files));
      },
      onFocus: () => setStatusMessage(null),
      onPaste: importFromClipboard,
    },
  };
}

function ScreenshotDropZoneFrame({
  busyMessage,
  children,
  emptyMessage,
  isDragging,
  label,
  stage,
  statusMessage,
  onBlur,
  onClick,
  onDragLeave,
  onDragOver,
  onDrop,
  onFocus,
  onPaste,
}: ScreenshotDropZoneFrameProps) {
  return (
    <div
      className={`screenshot-drop-zone${isDragging ? " is-dragging" : ""}`}
      tabIndex={0}
      role="group"
      aria-label={label}
      onBlur={onBlur}
      onClick={onClick}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onFocus={onFocus}
      onPaste={onPaste}
    >
      <header className="screenshot-drop-zone-header">
        <span>{stageLabel(stage)} screenshot</span>
        <strong>Drop / paste</strong>
      </header>
      {children ?? <p>{emptyMessage}</p>}
      {busyMessage ? (
        <p className="screenshot-drop-status">{busyMessage}</p>
      ) : null}
      {statusMessage ? (
        <p className="screenshot-drop-status">{statusMessage}</p>
      ) : null}
    </div>
  );
}

type DraftScreenshotGalleryProps = {
  confirmBeforeDelete: boolean;
  screenshots: DraftScreenshot[];
  onDelete: (id: string) => void | Promise<void>;
};

export function DraftScreenshotGallery({
  confirmBeforeDelete,
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
    if (confirmBeforeDelete && !window.confirm("Delete this screenshot?")) {
      return;
    }

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
  confirmBeforeDelete: boolean;
  screenshots: ScreenshotRow[];
  onChanged: () => void | Promise<void>;
  onDeleted?: (id: string) => void;
};

export function TradeScreenshotGallery({
  confirmBeforeDelete,
  screenshots,
  onChanged,
  onDeleted,
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
    if (confirmBeforeDelete && !window.confirm("Delete this screenshot?")) {
      return;
    }

    await deleteScreenshot(screenshot.id, screenshot.path);
    await deleteScreenshotFile(screenshot.path);
    if (lightbox?.id === screenshot.id) setLightbox(null);
    onDeleted?.(screenshot.id);
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

type ReadOnlyTradeScreenshotGalleryProps = {
  screenshots: ScreenshotRow[];
};

export function ReadOnlyTradeScreenshotGallery({
  screenshots,
}: ReadOnlyTradeScreenshotGalleryProps) {
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

  return (
    <>
      <div className="screenshot-gallery screenshot-gallery-readonly">
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
    <ModalShell
      ariaLabel={screenshot.caption || "Screenshot preview"}
      bodyClassName="screenshot-lightbox-body"
      modalClassName="screenshot-lightbox-modal"
      onClose={onClose}
      title={screenshot.caption || "Screenshot preview"}
    >
      <img
        className="lightbox-image"
        src={url}
        alt={screenshot.caption || "Screenshot"}
      />
    </ModalShell>
  );
}
