import { isTauri } from "@tauri-apps/api/core";
import { check, type DownloadEvent } from "@tauri-apps/plugin-updater";

export type AppUpdateState = {
  isBusy: boolean;
  message: string;
  tone: "idle" | "success" | "error";
};

type UpdateStateHandler = (state: AppUpdateState) => void;

function progressMessage(downloadedBytes: number, totalBytes: number) {
  if (!totalBytes) return "Downloading update...";

  return `Downloading update... ${Math.min(
    100,
    Math.round((downloadedBytes / totalBytes) * 100),
  )}%`;
}

function updateErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("endpoint") ||
    lowerMessage.includes("pubkey") ||
    lowerMessage.includes("public key")
  ) {
    return "Updater is not configured yet.";
  }

  return "Could not check for updates.";
}

export async function runAppUpdate(onState: UpdateStateHandler) {
  const show = (
    message: string,
    tone: AppUpdateState["tone"] = "idle",
    isBusy = false,
  ) => onState({ isBusy, message, tone });

  if (!isTauri()) {
    show("Updates work in the installed app.");
    return;
  }

  show("Checking for updates...", "idle", true);

  try {
    const update = await check();

    if (!update) {
      show("App is up to date.", "success");
      return;
    }

    let downloadedBytes = 0;
    let totalBytes = 0;

    await update.downloadAndInstall((event: DownloadEvent) => {
      if (event.event === "Started") {
        downloadedBytes = 0;
        totalBytes = event.data.contentLength ?? 0;
        show(progressMessage(downloadedBytes, totalBytes), "idle", true);
      }

      if (event.event === "Progress") {
        downloadedBytes += event.data.chunkLength;
        show(progressMessage(downloadedBytes, totalBytes), "idle", true);
      }

      if (event.event === "Finished") {
        show("Installing update...", "idle", true);
      }
    });

    show("Update installed. Restart the app.", "success");
  } catch (error) {
    show(updateErrorMessage(error), "error");
  }
}
