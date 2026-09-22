import { request } from "node:http";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
export type DesktopCommand = "start-recording" | "stop-recording" | "open-floating-note";
export function desktopRequest(
  command: DesktopCommand,
  socketPath = path.join(homedir(), "Library/Application Support/Prismical/launcher/raycast.sock"),
): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      { socketPath, method: "POST", path: `/${command}`, headers: { "X-Request-Id": randomUUID() }, timeout: 25000 },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
          if (body.length > 8192) req.destroy(new Error("Invalid desktop response"));
        });
        res.on("end", () => {
          try {
            const value = JSON.parse(body);
            if (typeof value.ok !== "boolean" || typeof value.message !== "string") throw new Error();
            resolve(value);
          } catch {
            reject(new Error("Invalid desktop response. Update Prismical."));
          }
        });
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("Desktop did not respond. Check Prismical before retrying.")));
    req.on("error", reject);
    req.end();
  });
}
