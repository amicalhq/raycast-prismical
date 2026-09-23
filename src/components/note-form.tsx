import {
  LocalStorage,
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  getSelectedText,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { Note, Page } from "../lib/api";
import { API_ORIGIN, client, noteUrl, settings } from "../lib/config";
import { createHash } from "node:crypto";
import { CaptureDraft, saveCapture } from "../lib/capture";
export function NoteForm({
  note,
  initialTitle = "",
  root = false,
}: {
  note?: Note;
  initialTitle?: string;
  root?: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState("");
  const [folder, setFolder] = useState("");
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string>();
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const { pop } = useNavigation();
  const [ready, setReady] = useState(false);
  const journalKey =
    "capture-" +
    createHash("sha256")
      .update(JSON.stringify([API_ORIGIN, settings().apiKey, note?.id || "new"]))
      .digest("hex");
  useEffect(() => {
    LocalStorage.getItem<string>(journalKey)
      .then((raw) => {
        if (raw) {
          const draft: CaptureDraft = JSON.parse(raw);
          setTitle(draft.title);
          setBody(draft.body);
          setFolder(draft.folder);
          setCreated(draft.id);
          setUncertain(draft.uncertain);
        }
        setReady(true);
      })
      .catch(() => showToast({ style: Toast.Style.Failure, title: "Could not restore draft" }));
  }, [journalKey]);
  async function persist(draft: CaptureDraft) {
    await LocalStorage.setItem(journalKey, JSON.stringify(draft));
    setCreated(draft.id);
    setUncertain(draft.uncertain);
  }
  useEffect(() => {
    if (note) return;
    const abort = new AbortController();
    async function load() {
      let cursor = "";
      do {
        const page = await client().request<Page<{ id: string; name: string }>>(
          "/v1/folders?" + new URLSearchParams({ limit: "100", ...(cursor ? { cursor } : {}) }),
          "GET",
          undefined,
          abort.signal,
        );
        setFolders((old) => [...old, ...page.results]);
        cursor = page.has_more ? page.next_cursor || "" : "";
      } while (cursor);
    }
    load().catch(() => {});
    return () => abort.abort();
  }, [note]);
  async function submit() {
    if (lock.current || uncertain || !ready) return;
    if (note && !body.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter text to append" });
      return;
    }
    if (body.length > 262144) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Note is too long",
        message: "Use less than 256 KB of text.",
      });
      return;
    }
    lock.current = true;
    setBusy(true);
    let id = note?.id || created;
    try {
      id = await saveCapture(client(), { title, body, folder, id, uncertain: false }, persist);
      await LocalStorage.removeItem(journalKey);
      await showToast({
        style: Toast.Style.Success,
        title: note ? "Text appended" : "Note created",
        primaryAction: { title: "Open Note", onAction: () => open(noteUrl(id!)) },
      });
      setBody("");
      pop();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: id ? "Could not save text" : "Could not create note",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function insert(source: "clipboard" | "selection") {
    try {
      const text = source === "clipboard" ? await Clipboard.readText() : await getSelectedText();
      if (!text) {
        await showToast({ style: Toast.Style.Failure, title: "No text available" });
        return;
      }
      setBody(text);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "No text available" });
    }
  }
  return (
    <Form
      enableDrafts={root}
      isLoading={busy || !ready}
      navigationTitle={root ? undefined : note ? "Append to Note" : "Create Note"}
      actions={
        <ActionPanel>
          {!uncertain && ready && (
            <Action.SubmitForm
              title={note ? "Append Text" : created ? "Save Text to Created Note" : "Create Note"}
              onSubmit={submit}
            />
          )}
          <Action
            title="Discard Saved Recovery"
            icon={Icon.Trash}
            onAction={async () => {
              if (lock.current) return;
              await LocalStorage.removeItem(journalKey);
              setCreated(undefined);
              setUncertain(false);
              setBody("");
              setReady(true);
            }}
          />
          <Action title="Use Clipboard" icon={Icon.Clipboard} onAction={() => insert("clipboard")} />
          <Action title="Use Selected Text" icon={Icon.Text} onAction={() => insert("selection")} />
          {(note?.id || created) && (
            <Action.OpenInBrowser title="Check Note in Prismical" url={noteUrl((note?.id || created)!)} />
          )}
          {uncertain && !busy && (
            <Action
              title="I Checked — Allow Retry"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                if (lock.current) return;
                return persist({ title, body, folder, id: note?.id || created, uncertain: false });
              }}
            />
          )}
        </ActionPanel>
      }
    >
      {uncertain && !busy && (
        <Form.Description
          title="Check Before Retrying"
          text="The request may have saved. Check Prismical before allowing a retry to avoid duplicate text or notes. Your draft is preserved."
        />
      )}
      {created && !note && !busy && (
        <Form.Description title="Note Created" text="The note already exists. Saving again writes to that same note." />
      )}
      {!note && !created && (
        <>
          <Form.TextField id="title" title="Title" value={title} onChange={setTitle} placeholder="Optional title" />
          <Form.Dropdown id="folder" title="Folder" value={folder} onChange={setFolder}>
            <Form.Dropdown.Item value="" title="No Folder" />
            {folders.map((f) => (
              <Form.Dropdown.Item key={f.id} value={f.id} title={f.name} />
            ))}
          </Form.Dropdown>
        </>
      )}
      <Form.TextArea
        id="body"
        title={note ? "Text to Append" : "Note"}
        value={body}
        onChange={setBody}
        placeholder="Write in Markdown…"
      />
    </Form>
  );
}
