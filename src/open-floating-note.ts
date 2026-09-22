import { runDesktop } from "./lib/run-desktop";
export default async function Command() {
  await runDesktop("open-floating-note");
}
