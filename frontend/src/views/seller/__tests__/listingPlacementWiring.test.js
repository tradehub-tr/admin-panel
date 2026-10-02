import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const view = readFileSync(new URL("../ListingFormView.vue", import.meta.url), "utf8");
const body = (name) => {
  const m = view.match(new RegExp(`async function ${name}\\([\\s\\S]*?\\n  }\\n`));
  assert.ok(m, `${name} bulunamadı`);
  return m[0];
};

test("Kırp kısayolu ve Crop Studio bu ekrandan kalktı", () => {
  assert.doesNotMatch(view, /openCrop\(/);
  assert.doesNotMatch(view, /CropStudioModal/);
  assert.doesNotMatch(view, /media\.actions\.crop/);
});

test("ana görsel ve her galeri kartında 'Nerelerde görünecek?'", () => {
  const buttons = view.match(/<ImagePlacementButton[\s\S]*?\/>/g) || [];
  assert.equal(buttons.length, 2);
  for (const b of buttons) {
    assert.match(b, /slot-key="product\.image"/);
    assert.match(b, /@open="openPlacement"/);
  }
  assert.match(buttons[1], /compact/);
});

test("pencere bir kez barındırılıyor", () => {
  assert.equal((view.match(/<ImagePlacementModal/g) || []).length, 1);
  assert.match(view, /v-model:open="placement\.state\.open"/);
  assert.match(view, /:return-focus="placement\.state\.returnFocus"/);
});

test("yükleme sonucu doğrudan pencere açmaz; hazır olma kuyruğuna girer", () => {
  assert.match(body("uploadImage"), /uploadPlacement\.enqueue\(\{\s*selected: 1,/);
  assert.match(body("uploadImageRow"), /uploadPlacement\.enqueue\(\{\s*selected: 1,/);
  assert.match(body("addImageRows"), /uploadPlacement\.enqueue\(\{\s*selected: files\.length,/);
});
