import assert from "node:assert/strict";
import { test } from "node:test";

import { usePlacementLauncher } from "../usePlacementLauncher.js";

const URL = "/files/c2/ozgen-banner.webp";

test("toplu yüklemede açılmaz", async () => {
  const l = usePlacementLauncher({ getPrefs: async () => ({ autoopen: true }) });
  assert.equal(
    await l.afterUpload({ selected: 3, fileUrl: URL, slotKey: "company.cover_image" }),
    false
  );
  assert.equal(l.state.open, false);
});

test("tek dosyada açılır; dosya adı çözülür; odak dönüşü fonksiyonla", async () => {
  const l = usePlacementLauncher({ getPrefs: async () => ({ autoopen: true }) });
  assert.equal(
    await l.afterUpload({ selected: 1, fileUrl: URL, slotKey: "company.cover_image" }),
    true
  );
  assert.equal(l.state.open, true);
  assert.equal(l.state.auto, true);
  assert.equal(l.state.fileName, "ozgen-banner.webp");
  assert.equal(typeof l.state.returnFocus, "function");
});

test("tercih kapalıysa açılmaz", async () => {
  const l = usePlacementLauncher({ getPrefs: async () => ({ autoopen: false }) });
  assert.equal(
    await l.afterUpload({ selected: 1, fileUrl: URL, slotKey: "company.cover_image" }),
    false
  );
});

test("tercih okunamazsa sessizce açılmaz", async () => {
  const l = usePlacementLauncher({
    getPrefs: async () => {
      throw new Error("offline");
    },
  });
  assert.equal(await l.afterUpload({ selected: 1, fileUrl: URL, slotKey: "product.image" }), false);
  assert.equal(l.state.open, false);
});

test("düğmeden açılış tetikleyiciyi saklar; adres yoksa açılmaz", () => {
  const l = usePlacementLauncher();
  const trigger = { focus() {} };
  assert.equal(l.show({ fileUrl: "", slotKey: "product.image" }), false);
  assert.equal(
    l.show({ fileUrl: URL, slotKey: "product.image", trigger, context: { productName: "Fırça" } }),
    true
  );
  assert.equal(l.state.returnFocus, trigger);
  assert.deepEqual(l.state.context, { productName: "Fırça" });
  l.hide();
  assert.equal(l.state.open, false);
});

test("final I-3: açık pencereyi yükleme sonrası otomatik açılış ele geçirmez", async () => {
  const l = usePlacementLauncher({ getPrefs: async () => ({ autoopen: true }) });
  const trigger = { focus() {} };
  l.show({ fileUrl: URL, slotKey: "company.cover_image", trigger });
  assert.equal(
    await l.afterUpload({
      selected: 1,
      fileUrl: "/files/c2/baska-satir.webp",
      slotKey: "product.image",
    }),
    false
  );
  assert.equal(l.state.open, true);
  assert.equal(l.state.fileUrl, URL);
  assert.equal(l.state.slotKey, "company.cover_image");
  assert.equal(l.state.returnFocus, trigger);
  assert.equal(l.state.auto, false);
});

test("final I-3: tercih okunurken açılan pencere de korunur", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  const l = usePlacementLauncher({ getPrefs: () => gate.then(() => ({ autoopen: true })) });
  const pending = l.afterUpload({
    selected: 1,
    fileUrl: "/files/c2/yeni.webp",
    slotKey: "product.image",
  });
  l.show({ fileUrl: URL, slotKey: "company.cover_image" });
  release();
  assert.equal(await pending, false);
  assert.equal(l.state.fileUrl, URL);
});
