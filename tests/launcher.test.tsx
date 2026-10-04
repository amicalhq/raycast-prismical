import { afterEach, beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  command: vi.fn(),
  apps: vi.fn(),
  open: vi.fn(),
  toast: { style: "", title: "", message: "" },
  hud: vi.fn(),
}));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => {
    throw new Error("Recording commands must not read API key preferences");
  },
  getApplications: mocks.apps,
  open: mocks.open,
  showHUD: mocks.hud,
  showToast: async () => mocks.toast,
  closeMainWindow: vi.fn(),
  Toast: { Style: { Animated: "animated", Failure: "failure" } },
}));
vi.mock("../src/lib/desktop", () => ({ desktopStatus: mocks.status, desktopCommand: mocks.command }));
import { runDesktop } from "../src/lib/run-desktop";
const ready = { ready: true };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.status.mockResolvedValue(ready);
  mocks.command.mockResolvedValue("Requested");
  mocks.apps.mockResolvedValue([{ bundleId: "com.prismical.desktop", path: "/Applications/Prismical.app" }]);
});
test("existing bridge waits for readiness and dispatches once", async () => {
  mocks.status.mockResolvedValueOnce({ ready: false });
  await runDesktop("start-recording");
  expect(mocks.status).toHaveBeenCalledTimes(2);
  expect(mocks.command).toHaveBeenCalledTimes(1);
  expect(mocks.open).not.toHaveBeenCalled();
});
test("cold launch opens exact bundle and only retries status", async () => {
  mocks.status.mockRejectedValueOnce(Object.assign(new Error(), { code: "ENOENT" }));
  await runDesktop("start-recording");
  expect(mocks.open).toHaveBeenCalledWith("/Applications/Prismical.app");
  expect(mocks.command).toHaveBeenCalledTimes(1);
});
test("stop works without a ready workspace", async () => {
  mocks.status.mockResolvedValue({ ready: false });
  await runDesktop("stop-recording");
  expect(mocks.command).toHaveBeenCalledWith("stop-recording", { ready: false });
});
test("uncertain POST produces failure without retry", async () => {
  mocks.command.mockRejectedValue(new Error("Check Prismical"));
  await runDesktop("start-recording");
  expect(mocks.command).toHaveBeenCalledTimes(1);
  expect(mocks.toast.style).toBe("failure");
});
test("missing app never sends a command", async () => {
  mocks.status.mockRejectedValue(Object.assign(new Error(), { code: "ENOENT" }));
  mocks.apps.mockResolvedValue([]);
  await runDesktop("start-recording");
  expect(mocks.command).not.toHaveBeenCalled();
  expect(mocks.toast.message).toContain("Install Prismical");
});

afterEach(() => vi.useRealTimers());
test.each(["not-ready", "no-socket"])(
  "persistent %s terminates within readiness budget without a POST",
  async (failure) => {
    vi.useFakeTimers();
    if (failure === "not-ready") mocks.status.mockResolvedValue({ ready: false });
    else mocks.status.mockRejectedValue(Object.assign(new Error(), { code: "ENOENT" }));
    const start = Date.now();
    const running = runDesktop("start-recording");
    await vi.runAllTimersAsync();
    await running;
    expect(Date.now() - start).toBeLessThanOrEqual(10000);
    expect(mocks.command).not.toHaveBeenCalled();
    expect(mocks.toast.style).toBe("failure");
  },
);
test("both recording entrypoints work without reading preferences", async () => {
  const start = (await import("../src/start-recording")).default;
  const stop = (await import("../src/stop-recording")).default;
  await start();
  await stop();
  expect(mocks.command.mock.calls.map((call) => call[0])).toEqual(["start-recording", "stop-recording"]);
});
