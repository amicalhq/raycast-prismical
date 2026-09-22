# Prismical

Search, preview, and capture notes in your Prismical Cloud workspace from Raycast.

## Commands

- **Search Notes** — browse recent notes with emoji icons, search all notes, preview Markdown, view existing meeting transcripts, and copy note content or links.
- **Create Note** — capture a title and Markdown body, with an optional destination folder. Explicit actions let you use selected text or clipboard contents.
- **Append to Note** — find a writable note and add text without replacing its existing content.

Open notes in Prismical's web app. Assign command aliases and hotkeys in Raycast Settings. Recent notes display their emoji icons; full-text search uses document icons because search responses do not include note icons. Emoji in titles and Markdown remains visible.

## Setup

1. Sign in to [Prismical Cloud](https://app.prismical.ai).
2. Go to **Settings → API & MCP** and create a dedicated API key for your workspace.
3. Enter it in **Prismical API Key** when opening a command for the first time.

The API key is the only extension setting. Production server URLs are configured automatically. The workspace name appears above the note list. Replace the key to change workspaces or recover from an expired/revoked key.

Requires macOS, Raycast, a Prismical Cloud account, and API access for that workspace. No desktop installation is required. Desktop local-only notes and recording controls are not supported in this release. Existing cloud meeting transcripts can be viewed.

## Privacy and recovery

Cloud requests go directly to Prismical. The API key is stored in a Raycast password preference and sent only to the Prismical API; redirects are rejected. Clipboard and selected text are read only when you choose those actions. The extension adds no analytics or persistent note cache.

Failed or interrupted captures can retain draft text in Raycast local storage, scoped to the API origin, key, and destination. Partial creates preserve the note ID so recovery writes to the same note. Ambiguous writes require checking Prismical before allowing a retry. No automatic mutation retries occur. **Discard Saved Recovery** clears the local recovery state, not the server note.

Raycast preserves unsent text in the root Create Note command. Nested forms preserve submitted drafts after a failed or uncertain save; unsent nested-form text is not retained after leaving the form.

## Development

Requires Node >=22.22.2. This is a standalone npm project.

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
```

Tests inject a fetch implementation into the API client. Development servers and screenshot fixtures should use an isolated development copy; production commands do not expose server overrides.

`main` contains the cloud-only first release. The `wip/desktop-v2` branch preserves experimental desktop commands for a later release and is not ready for Store submission.

Publishing to the Raycast Store is a separate release step. Do not publish this package to npm.
