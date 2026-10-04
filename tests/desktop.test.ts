import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { desktopStatus, desktopCommand, desktopRequest } from "../src/lib/desktop";
const status = {
  protocolVersion: 1 as const,
  appVersion: "1.0",
  capabilities: ["start-recording", "stop-recording"],
  session: "session",
  ready: true,
  recordingStatus: "idle",
};
async function fixture(
  fn: (req: IncomingMessage, res: ServerResponse) => void,
  run: (socket: string) => Promise<void>,
) {
  const dir = await mkdtemp(path.join(tmpdir(), "rc-"));
  const socket = path.join(dir, "s");
  const server = createServer(fn);
  await new Promise<void>((resolve) => server.listen(socket, resolve));
  try {
    await run(socket);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  }
}
test("desktop handshake then command carries expiry and session without credentials", async () => {
  const calls: IncomingMessage[] = [];
  await fixture(
    (req, res) => {
      calls.push(req);
      res.end(JSON.stringify(req.url === "/status" ? status : { ok: true, message: "Requested" }));
    },
    async (socket) => {
      assert.deepEqual(await desktopStatus(socket), status);
      assert.equal(await desktopCommand("start-recording", status, socket), "Requested");
    },
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, "POST");
  assert.equal(calls[1].headers["x-session"], "session");
  assert.match(String(calls[1].headers["x-request-id"]), /^[a-f0-9-]{36}$/);
  assert.ok(Number(calls[1].headers["x-expires-at"]) > Date.now());
  assert.equal(calls[1].headers.authorization, undefined);
});
test("uncertain command failure is never retried", async () => {
  let calls = 0;
  await fixture(
    (req) => {
      calls++;
      req.socket.destroy();
    },
    async (socket) => {
      await assert.rejects(desktopCommand("start-recording", status, socket));
    },
  );
  assert.equal(calls, 1);
});
test("unsupported desktop and missing capability fail before mutation", async () => {
  await fixture(
    (_req, res) => res.end(JSON.stringify({ ...status, protocolVersion: 2 })),
    async (socket) => assert.rejects(desktopStatus(socket), /Update Prismical/),
  );
  await assert.rejects(
    desktopCommand("start-recording", { ...status, capabilities: [] }, "missing"),
    /Update Prismical/,
  );
});
test("reject malformed, oversized and non-success replies", async () => {
  for (const body of ["{", "x".repeat(9000), "null"])
    await fixture(
      (_req, res) => res.end(body),
      async (socket) => assert.rejects(desktopStatus(socket)),
    );
  await fixture(
    (_req, res) => {
      res.writeHead(500);
      res.end(JSON.stringify({ ok: true, message: "false success" }));
    },
    async (socket) => assert.rejects(desktopCommand("stop-recording", status, socket)),
  );
});
test("absolute request timeout closes a silent peer", async () => {
  await fixture(
    () => {},
    async (socket) => assert.rejects(desktopRequest("status", {}, socket, 20), /did not respond/),
  );
});
