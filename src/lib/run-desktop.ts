import { closeMainWindow, getApplications, open, showHUD, showToast, Toast } from "@raycast/api";
import { settings } from "./config";
import { DesktopCommand, desktopRequest } from "./desktop";
export async function runDesktop(command: DesktopCommand) {
  const socket = settings().desktopSocket || undefined;
  try {
    await closeMainWindow();
    let result;
    try {
      result = await desktopRequest(command, socket);
    } catch (error) {
      if (!["ENOENT", "ECONNREFUSED"].includes((error as NodeJS.ErrnoException).code || "")) throw error;
      if (socket) throw new Error("Start the development desktop app for the configured socket.");
      const app = (await getApplications()).find((a) => a.name === "Prismical");
      if (!app) throw new Error("Install Prismical desktop to use recording shortcuts.");
      await open(app.path);
      // Only connection failures are retried; never resend an uncertain command.
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          result = await desktopRequest(command, socket);
          break;
        } catch (retryError) {
          if (!["ENOENT", "ECONNREFUSED"].includes((retryError as NodeJS.ErrnoException).code || "")) throw retryError;
        }
      }
      if (!result)
        throw new Error(
          "This desktop version does not provide Raycast commands. Install a compatible build and finish setup.",
        );
    }
    if (!result.ok) throw new Error(result.message);
    await showHUD(result.message);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Prismical Desktop",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
