import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_MEDIA_FOLDER_MOVE,
  MEDIA_FOLDER_DRAG_MIME,
  normalizeMediaFolderDragUrls,
  readMediaFolderDrag,
  writeMediaFolderDrag,
} from "../folderDrag.js";

function transfer(initial = "") {
  const values = new Map([[MEDIA_FOLDER_DRAG_MIME, initial]]);
  return {
    effectAllowed: "none",
    getData: (type) => values.get(type) || "",
    setData: (type, value) => values.set(type, value),
  };
}

test("klasör drag verisi site-içi yolları sıralı ve tekil tutar", () => {
  const urls = normalizeMediaFolderDragUrls([
    "/files/a.webp",
    "https://example.test/files/b.webp",
    "/files/a.webp",
    "//cdn.example.test/c.webp",
    null,
    "/private/files/d.pdf",
  ]);

  assert.deepEqual(urls, ["/files/a.webp", "/private/files/d.pdf"]);
});

test("bozuk ya da başka biçimdeki bırakma güvenle boş döner", () => {
  assert.deepEqual(readMediaFolderDrag(transfer("{")), []);
  assert.deepEqual(readMediaFolderDrag(null), []);
  assert.deepEqual(readMediaFolderDrag(transfer(JSON.stringify({ file: "/files/a.webp" }))), []);
});

test("yazılan drag verisi özel MIME kullanır ve move olarak işaretlenir", () => {
  const dataTransfer = transfer();

  const written = writeMediaFolderDrag(dataTransfer, ["/files/a.webp", "/files/b.webp"]);

  assert.deepEqual(written, ["/files/a.webp", "/files/b.webp"]);
  assert.equal(dataTransfer.effectAllowed, "move");
  assert.deepEqual(readMediaFolderDrag(dataTransfer), written);
  assert.equal(MAX_MEDIA_FOLDER_MOVE, 200);
});
