import { closeMainWindow, getApplications, open, showHUD, showToast, Toast } from "@raycast/api";
import { desktopCommand, desktopStatus, DesktopCommand } from "./desktop";
const unavailable = (error: unknown) =>
  ["ENOENT", "ECONNREFUSED"].includes((error as NodeJS.ErrnoException)?.code || "");
export async function runDesktop(command: DesktopCommand) {
  let appPath: string | undefined;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting to Prismical…" });
  try {
    let status;
    let launched = false;
    const until = Date.now() + 10_000;
    while (Date.now() < until) {
      try {
        status = await desktopStatus(undefined, Math.max(1, until - Date.now()));
        if (status.ready || command === "stop-recording") break;
      } catch (error) {
        if (!unavailable(error)) throw error;
        if (!launched) {
          const app = (await getApplications()).find((value) => value.bundleId === "com.prismical.desktop");
          if (!app) throw new Error("Install Prismical for Mac to use recording shortcuts.");
          appPath = app.path;
          toast.title = "Opening Prismical…";
          await open(app.path);
          launched = true;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(250, Math.max(1, until - Date.now()))));
    }
    if (!status) throw new Error("Could not connect to Prismical. Open it and check for updates, then try again.");
    if (command === "start-recording" && !status.ready)
      throw new Error("Open Prismical and select your workspace, then try again.");
    // Only readiness is retried. A recording command is sent exactly once.
    toast.title = command === "start-recording" ? "Requesting recording…" : "Stopping recording…";
    const message = await desktopCommand(command, status);
    await closeMainWindow();
    await showHUD(message);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Prismical Desktop";
    toast.message = error instanceof Error ? error.message : String(error);
    toast.primaryAction = {
      title: "Open Prismical",
      onAction: async () => {
        const app =
          appPath || (await getApplications()).find((value) => value.bundleId === "com.prismical.desktop")?.path;
        await open(app || "https://prismical.ai/download");
      },
    };
  }
}
