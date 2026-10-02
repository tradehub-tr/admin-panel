import assert from "node:assert/strict";
import { test } from "node:test";

import messages from "../messages.js";
import { PLACES } from "../../vendor/placements.js";

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]
  );
}
const get = (obj, path) => path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);

test("dört dil aynı anahtar kümesini taşır", () => {
  const keys = (l) =>
    flatten(messages[l])
      .map(([k]) => k)
      .sort();
  const tr = keys("tr");
  for (const l of ["en", "ru", "ar"]) assert.deepEqual(keys(l), tr, l);
});

test("her yer etiketi dört dilde çözülür", () => {
  const labelKeys = new Set(
    Object.values(PLACES)
      .flat()
      .map((p) => p.labelKey)
  );
  for (const l of ["tr", "en", "ru", "ar"])
    for (const k of labelKeys) assert.equal(typeof get(messages[l], k), "string", `${l} ${k}`);
});

test("Rails biçimli %{…} yok (vue-i18n onu yer tutucu sayar)", () => {
  for (const l of ["tr", "en", "ru", "ar"])
    for (const [k, v] of flatten(messages[l])) assert.doesNotMatch(String(v), /%\{/, `${l} ${k}`);
});

test("Türkçe kopya tasarımla birebir", () => {
  const ip = messages.tr.imagePlacement;
  assert.equal(ip.title, "Görseliniz nerelerde görünecek?");
  assert.equal(ip.button, "Nerelerde görünecek?");
  assert.equal(ip.chip.full, "Tamamı görünüyor");
  assert.equal(ip.autoOpen, "Yeni görsel yüklediğimde otomatik açılsın");
  assert.equal(ip.badge, "{n} yerde kenarlar kesiliyor");
});

test("final I-5: 'kaydedilemiyor' mesajları gerçeği söyler (dakikalar sözü yok)", () => {
  const st = messages.tr.imagePlacement.status;
  assert.equal(st.cannotSave, "Görsel hazırlanıyor; hazır olunca Kaydet kendiliğinden açılır.");
  assert.equal(
    st.cannotSaveReopen,
    "Görsel henüz hazır değil. Sayfayı kaydedin, birkaç dakika sonra bu pencereyi yeniden açın."
  );
  for (const l of ["tr", "en", "ru", "ar"])
    assert.doesNotMatch(
      messages[l].imagePlacement.status.cannotSave,
      /dakika|minute|минут|دقائق/,
      l
    );
});
