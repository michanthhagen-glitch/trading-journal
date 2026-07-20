import { Camera, FolderOpen, Monitor, Plus, RefreshCw } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { ModalShell } from "../../../components/ModalShell";
import {
  addScreenshot,
  deleteScreenshot,
  type ScreenshotRow,
} from "../../../shared/db/database";
import {
  captureWindowScreenshot,
  captureTradingViewScreenshot,
  deleteScreenshotFile,
  importScreenshotFromClipboard,
  importScreenshotFromPath,
  listCaptureWindows,
  resolveScreenshotUrl,
  saveScreenshotBytes,
  type CaptureWindowInfo,
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
  dropZoneRef: RefObject<HTMLDivElement>;
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
  dropZoneRef: RefObject<HTMLDivElement>;
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

type DropPoint = {
  x: number;
  y: number;
};

type RectLike = Pick<DOMRectReadOnly, "bottom" | "left" | "right" | "top">;

type NativeDragDropPayload =
  | { type: "enter"; paths: string[]; position: DropPoint }
  | { type: "over"; position: DropPoint }
  | { type: "drop"; paths: string[]; position: DropPoint }
  | { type: "leave" };

type NativeDragDropEvent = {
  payload: NativeDragDropPayload;
};

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isSupportedScreenshotFilePath(path: string): boolean {
  return /\.(png|jpe?g)$/i.test(path);
}

export function isPointInsideScreenshotDropRect(
  point: DropPoint,
  rect: RectLike,
  devicePixelRatio = 1,
): boolean {
  const cssPoint =
    devicePixelRatio > 1
      ? { x: point.x / devicePixelRatio, y: point.y / devicePixelRatio }
      : point;

  return (
    cssPoint.x >= rect.left &&
    cssPoint.x <= rect.right &&
    cssPoint.y >= rect.top &&
    cssPoint.y <= rect.bottom
  );
}

export function selectableCaptureWindows(
  windows: CaptureWindowInfo[],
): CaptureWindowInfo[] {
  return windows
    .filter(
      (window) =>
        !`${window.appName} ${window.title}`
          .toLowerCase()
          .includes("methodmark"),
    )
    .sort((left, right) => {
      if (left.isFocused !== right.isFocused) return left.isFocused ? -1 : 1;
      return `${left.appName} ${left.title}`.localeCompare(
        `${right.appName} ${right.title}`,
      );
    });
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localScreenshots, setLocalScreenshots] =
    useState<ScreenshotRow[]>(screenshots);
  const [selecting, setSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  async function addImportedScreenshot(relPath: string) {
    const row = await addScreenshot(tradeId, stage, relPath);
    setLocalScreenshots((current) => [...current, row]);
    await onChanged();
  }

  const controller = useScreenshotDropZone(stage, addImportedScreenshot);

  async function selectImage() {
    if (selecting) return;
    setSelectionError(null);

    if (!isTauri()) {
      inputRef.current?.click();
      return;
    }

    setSelecting(true);
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const picked = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }],
      });
      if (!picked || typeof picked !== "string") return;
      await addImportedScreenshot(await importScreenshotFromPath(picked));
    } catch (error) {
      console.error(error);
      setSelectionError("Could not import that screenshot.");
    } finally {
      setSelecting(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setSelecting(true);
    setSelectionError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await addImportedScreenshot(
        await saveScreenshotBytes(bytes, imageExt(file.name)),
      );
    } catch (error) {
      console.error(error);
      setSelectionError("Could not import that screenshot.");
    } finally {
      setSelecting(false);
    }
  }

  useEffect(() => {
    setLocalScreenshots(screenshots);
  }, [screenshots]);

  return (
    <ScreenshotDropZoneFrame
      {...controller.dropZoneHandlers}
      busyMessage={controller.busyMessage}
      dropZoneRef={controller.dropZoneRef}
      emptyMessage="Select or drag and drop an image."
      isDragging={controller.isDragging}
      label={`Add ${stageLabel(stage)} screenshot`}
      stage={stage}
      statusMessage={controller.statusMessage}
    >
      <div className="screenshot-edit-actions">
        <button
          className="secondary-button screenshot-edit-select"
          type="button"
          onClick={selectImage}
          disabled={selecting}
        >
          <FolderOpen size={15} aria-hidden="true" />
          {selecting ? "Adding..." : "Select image"}
        </button>
        <span>or drag and drop</span>
      </div>
      <input
        ref={inputRef}
        className="screenshot-file-input"
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileChange}
      />
      {selectionError ? (
        <p className="screenshot-drop-status" role="alert">
          {selectionError}
        </p>
      ) : null}
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
  const [windowPickerOpen, setWindowPickerOpen] = useState(false);
  const [windowChoices, setWindowChoices] = useState<CaptureWindowInfo[]>([]);
  const [loadingWindows, setLoadingWindows] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  async function importFromDisk() {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const picked = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }],
    });
    if (!picked || typeof picked !== "string") return false;
    const relPath = await importScreenshotFromPath(picked);
    await onImported(relPath);
    return true;
  }

  async function openWindowPicker(errorMessage: string | null = null) {
    setWindowPickerOpen(true);
    setLoadingWindows(true);
    setCaptureError(errorMessage);
    try {
      setWindowChoices(selectableCaptureWindows(await listCaptureWindows()));
    } catch (error) {
      console.error(error);
      setWindowChoices([]);
      setCaptureError("Could not read the open app windows.");
    } finally {
      setLoadingWindows(false);
    }
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

      await openWindowPicker();
    } catch (error) {
      console.error(error);
      await openWindowPicker(
        "TradingView could not be captured. Choose another open window.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleWindowCapture(window: CaptureWindowInfo) {
    if (importing) return;
    setImporting(true);
    setCaptureError(null);
    try {
      const path = await captureWindowScreenshot(window.id);
      await onImported(path);
      setWindowPickerOpen(false);
    } catch (error) {
      console.error(error);
      setCaptureError(
        "Could not capture that window. Try again or select a saved screenshot.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleFileFallback() {
    if (importing) return;
    setImporting(true);
    setCaptureError(null);
    try {
      if (await importFromDisk()) setWindowPickerOpen(false);
    } catch (error) {
      console.error(error);
      setCaptureError("Could not import that screenshot.");
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

  const label = `Capture ${stageLabel(stage)} screenshot`;

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
      {windowPickerOpen ? (
        <ModalShell
          title="Choose screenshot source"
          subtitle="Pick an open app window, or use a saved image as the final fallback."
          modalClassName="screenshot-source-modal"
          onClose={() => setWindowPickerOpen(false)}
          headerActions={
            <button
              className="icon-button"
              type="button"
              aria-label="Refresh open windows"
              title="Refresh open windows"
              onClick={() => openWindowPicker(captureError)}
              disabled={loadingWindows || importing}
            >
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          }
          footer={
            <button
              className="secondary-button screenshot-file-fallback"
              type="button"
              onClick={handleFileFallback}
              disabled={importing}
            >
              <FolderOpen size={15} aria-hidden="true" />
              Select saved screenshot
            </button>
          }
        >
          <div className="screenshot-source-content">
            {captureError ? (
              <p className="screenshot-source-error" role="alert">
                {captureError}
              </p>
            ) : null}
            {loadingWindows ? (
              <p className="screenshot-source-empty">Reading open windows...</p>
            ) : windowChoices.length === 0 ? (
              <p className="screenshot-source-empty">
                No other app windows are available. You can still select a saved
                screenshot below.
              </p>
            ) : (
              <div className="screenshot-window-list">
                {windowChoices.map((window) => (
                  <button
                    className="screenshot-window-option"
                    type="button"
                    key={window.id}
                    onClick={() => handleWindowCapture(window)}
                    disabled={importing}
                  >
                    <span className="screenshot-window-icon" aria-hidden="true">
                      <Monitor size={17} />
                    </span>
                    <span className="screenshot-window-copy">
                      <strong>{window.appName || "App window"}</strong>
                      <small>{window.title || "Untitled window"}</small>
                    </span>
                    <span className="screenshot-window-meta">
                      {window.isMinimized
                        ? "Minimized"
                        : `${window.width} x ${window.height}`}
                    </span>
                    <Camera size={16} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </ModalShell>
      ) : null}
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
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const nativeHoverRef = useRef(false);
  const nativePathImportRef = useRef<(paths: string[]) => Promise<void>>(
    async () => {},
  );

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

  async function importNativePaths(paths: string[]) {
    const imagePaths = paths.filter(isSupportedScreenshotFilePath);
    if (imagePaths.length === 0) {
      setStatusMessage("No image found.");
      clearStatusSoon();
      return;
    }

    setBusyMessage("Adding screenshot...");
    setStatusMessage(null);
    try {
      for (const path of imagePaths) {
        const relPath = await importScreenshotFromPath(path);
        await onImported(relPath);
      }
      setStatusMessage(
        imagePaths.length === 1
          ? `${stageLabel(stage)} screenshot added.`
          : `${imagePaths.length} screenshots added.`,
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

  nativePathImportRef.current = importNativePaths;

  function nativeDropIsInside(position?: DropPoint): boolean {
    if (!position) return nativeHoverRef.current;
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return false;

    return isPointInsideScreenshotDropRect(
      position,
      rect,
      window.devicePixelRatio || 1,
    );
  }

  useEffect(() => {
    if (!isTauri()) return undefined;

    let cancelled = false;
    let unlisten: (() => void) | null = null;

    import("@tauri-apps/api/webview")
      .then(({ getCurrentWebview }) =>
        getCurrentWebview().onDragDropEvent(async (event) => {
          const payload = (event as NativeDragDropEvent).payload;

          if (payload.type === "enter" || payload.type === "over") {
            const inside = nativeDropIsInside(payload.position);
            nativeHoverRef.current = inside;
            setIsDragging(inside);
            return;
          }

          if (payload.type === "drop") {
            const inside = nativeDropIsInside(payload.position);
            nativeHoverRef.current = false;
            setIsDragging(false);
            if (!inside) return;
            await nativePathImportRef.current(payload.paths);
            return;
          }

          nativeHoverRef.current = false;
          setIsDragging(false);
        }),
      )
      .then((nextUnlisten) => {
        if (cancelled) {
          nextUnlisten();
          return;
        }
        unlisten = nextUnlisten;
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
      nativeHoverRef.current = false;
      unlisten?.();
    };
  }, []);

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
    dropZoneRef,
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
  dropZoneRef,
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
      ref={dropZoneRef}
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
