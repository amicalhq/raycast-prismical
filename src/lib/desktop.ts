import { request } from "node:http";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
export type DesktopCommand = "start-recording" | "stop-recording";
export const desktopSocket = path.join(homedir(), "Library/Application Support/Prismical/launcher/raycast.sock");
export interface DesktopStatus {
  protocolVersion: 1;
  appVersion: string;
  capabilities: string[];
  session: string;
  ready: boolean;
  recordingStatus: string;
}
export function desktopRequest(
  route: string,
  headers: Record<string, string> = {},
  socketPath = desktopSocket,
  timeoutMs = 12_000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = request(
      { socketPath, method: route === "status" ? "GET" : "POST", path: `/${route}`, headers },
      (res) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 8192) {
            req.destroy(new Error("Invalid desktop response. Update Prismical."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => {
          try {
            if (res.statusCode !== 200)
              throw new Error("Desktop could not complete the request. Check Prismical before trying again.");
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    // Absolute deadline also covers a peer that sends a slow trickle of bytes.
    const timer = setTimeout(
      () => req.destroy(new Error("Desktop did not respond. Check Prismical before trying again.")),
      timeoutMs,
    );
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end();
  });
}
export async function desktopStatus(socketPath = desktopSocket, timeoutMs = 12_000): Promise<DesktopStatus> {
  const value = (await desktopRequest("status", {}, socketPath, timeoutMs)) as Partial<DesktopStatus> | null;
  if (
    !value ||
    value.protocolVersion !== 1 ||
    typeof value.appVersion !== "string" ||
    typeof value.session !== "string" ||
    typeof value.ready !== "boolean" ||
    typeof value.recordingStatus !== "string" ||
    !Array.isArray(value.capabilities) ||
    !value.capabilities.every((x) => typeof x === "string")
  )
    throw new Error("Update Prismical to a version with Raycast recording shortcuts.");
  return value as DesktopStatus;
}
export async function desktopCommand(command: DesktopCommand, status: DesktopStatus, socketPath = desktopSocket) {
  if (!status.capabilities.includes(command)) throw new Error("Update Prismical to use this recording shortcut.");
  const value = (await desktopRequest(
    command,
    { "X-Request-Id": randomUUID(), "X-Session": status.session, "X-Expires-At": String(Date.now() + 10_000) },
    socketPath,
  )) as { ok?: unknown; message?: unknown } | null;
  if (!value || typeof value.ok !== "boolean" || typeof value.message !== "string")
    throw new Error("Invalid desktop response. Check Prismical before trying again.");
  if (!value.ok) throw new Error(value.message);
  return value.message;
}
