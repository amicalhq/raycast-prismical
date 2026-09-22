# Prismical — Desktop v2 WIP

**Experimental branch. Do not submit to the Store.** The cloud-only first release lives on `main`. These desktop commands require a compatible public desktop release, version documentation, and release verification before promotion.

Find and capture notes without leaving your keyboard, or start a desktop recording in a fresh floating note.

## Commands

- **Search Notes** — recent notes with their emoji icons, full-text search, Markdown preview, copy link/body, transcript, and open in Prismical.
- **Create Note** — title, Markdown body and optional folder. Use Selected Text / Use Clipboard are explicit actions.
- **Append to Note** — choose a writable note and add text without replacing its existing body.
- **Start Recording in New Note** — opens Prismical's floating note and requests recording in the desktop's active workspace.
- **Stop Recording** — stops the current desktop recording.
- **Open Floating Note** — opens the desktop floating note.

Assign aliases and hotkeys in Raycast Settings → Extensions. Existing shortcuts are left unchanged.

## Setup

Cloud commands require a Prismical account and a dedicated API key from Prismical Settings → API & MCP. Set **Prismical API Key** in this extension's preferences. The bound workspace appears in Search Notes. Revoked keys can be replaced in preferences. Cloud notes are fetched on demand, without a persistent note cache.

Desktop commands need a Prismical desktop build that provides the launcher socket. A supported public release must be available before these commands are submitted to the Store. Older builds cannot accept these commands. They use the desktop's active account/workspace or local mode; this can differ from your API key's workspace. They do not need an API key. Recording permissions, provider/model setup and plan restrictions are handled visibly in Prismical. A “recording requested” message means the command was dispatched; verify the recording indicator in Prismical.

The initial release supports macOS. Desktop commands use a user-owned Unix socket under `~/Library/Application Support/Prismical/launcher/raycast.sock`, inside a directory accessible only to your user. They do not expose a network port or start recording through public URL links.

## Development

Requires Node >=22.22.2 and Raycast. Generated with Raycast's Create Extension command, then updated to the current SDK.

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

This folder is a standalone npm project; it does not depend on monorepo packages. For local cloud testing set Core API URL to `https://prismical-core.localhost` and Web App URL to `https://prismical-web.localhost`, with a dedicated development API key. The note service must run for body writes. Trust the portless CA; do not disable TLS verification. Set Desktop Socket Path only when testing a separately launched development profile.

## Recovery

A partial create preserves the note ID and draft in extension-local storage, scoped to the API origin, credential, and destination. Retrying continues on that note. Interrupted or ambiguous writes require checking Prismical before explicitly allowing retry. Append is never automatically retried. “Discard Saved Recovery” clears the recovery state, not the note on the server. Raycast preserves unsent text in the root Create Note command. Nested forms preserve submitted drafts after a failed or uncertain save; unsent nested-form text is not retained after leaving the form.

## Verification

Unit tests cover HTTP authentication/errors, pagination, cancellation, mutation ambiguity, and partial-create recovery. Desktop tests cover private socket permissions, command validation, duplicate starts and lifecycle cleanup. Native Raycast and packaged desktop checks are also required before release.

Publishing to the Raycast Store is a separate release step. Do not publish this package to npm.

## Privacy

The extension sends cloud requests directly to your configured Prismical API. Your API key is stored in a Raycast password preference and is sent only to that API origin; HTTP redirects are rejected. Selected text and clipboard contents are read only when you choose the corresponding action. Failed or interrupted captures may retain draft content in Raycast local storage until resolved or discarded. The extension adds no analytics.

Note emoji icons are displayed in recent notes. Full-text search currently returns no icon field, so search results use a document icon. Emoji in titles and Markdown remains visible in either view.
