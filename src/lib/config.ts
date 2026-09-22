import { getPreferenceValues } from "@raycast/api";
import { Api, origin } from "./api";
export interface Settings {
  apiKey?: string;
  apiUrl?: string;
  webUrl?: string;
  desktopSocket?: string;
}
export const settings = () => getPreferenceValues<Settings>();
export function client() {
  const p = settings();
  return new Api(p.apiUrl || "https://api.prismical.ai", p.apiKey || "");
}
export function noteUrl(id: string) {
  return `${origin(settings().webUrl || "https://app.prismical.ai")}/notes/${encodeURIComponent(id)}`;
}
