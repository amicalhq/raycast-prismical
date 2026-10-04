import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { ReactNode } from "react";
import { settings } from "../lib/config";
export function AccountRequired({ children }: { children: ReactNode }) {
  if (settings().apiKey?.trim()) return children;
  return (
    <Detail
      markdown={
        "# Connect Prismical\n\nOpen the Prismical app and go to **Settings → API & MCP**. Create an API key for your workspace, then enter it in **Prismical API Key**.\n\nDesktop recording commands work without an API key."
      }
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open Prismical" url="https://app.prismical.ai" />
        </ActionPanel>
      }
    />
  );
}
