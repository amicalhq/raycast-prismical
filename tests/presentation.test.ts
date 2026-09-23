import { strict as assert } from "node:assert";
import { test } from "node:test";
import { appendCapture, folderLabel, previewMarkdown } from "../src/lib/presentation";

test("capture preserves existing text", () => {
  assert.equal(appendCapture("draft", "clipboard"), "draft\n\nclipboard");
  assert.equal(appendCapture("", "selection"), "selection");
});
test("folder labels distinguish nested names and terminate on cycles", () => {
  const folders = [
    { id: "a", name: "Work" },
    { id: "b", name: "Notes", parent_id: "a" },
  ];
  assert.equal(folderLabel(folders[1], folders), "Work / Notes");
  assert.equal(folderLabel({ id: "c", name: "Cycle", parent_id: "c" }, []), "Cycle");
});
test("preview suppresses inline, reference and HTML images while retaining text and links", () => {
  const result = previewMarkdown(
    'Hello **world**\n\n![inline](https://example.com/pixel)\n\n![ref][pic]\n\n[pic]: https://example.com/pixel2\n\n<img src="https://example.com/pixel3">\n\n[Open](https://example.com)',
  );
  assert.doesNotMatch(result, /!\[|<img/);
  assert.match(result, /Hello \*\*world\*\*/);
  assert.match(result, /\[Open\]\(https:\/\/example.com\)/);
});
