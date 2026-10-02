import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import tr from "../../../i18n/locales/tr.js";
import en from "../../../i18n/locales/en.js";
import ru from "../../../i18n/locales/ru.js";
import ar from "../../../i18n/locales/ar.js";
import { DASH, factRows, renditionFacts, sourceFacts } from "../qualityFacts.js";

/**
 * Kalite sekmesinin DPI / renk uzayı / şeffaflık hücreleri.
 *
 * Eskiden bu üç satır sabit "—" idi ("arka tarafta karşılığı YOK"). Artık iki
 * dosyadan da ölçülüyor; burada biçimleyicinin kuralları sınanıyor:
 *   - DPI 0 "Dosyada yok" yazar (ölçüm sonucu) — "—" DEĞİL, "72" hiç DEĞİL.
 *   - Etiketsiz RGB "RGB (profilsiz)" — sRGB diye iddia edilmez.
 *   - "—" yalnız okunamayan / diskte olmayan / ölçülmemiş dosyada.
 *
 * Sabit veriler 2026-09-30'da yerel sitede `manifest_batch` (Administrator)
 * ile ölçülen gerçek yanıtlardan alındı:
 *   - /files/54/54c080e1895d0273ace1a732ea696d4a.webp → kaynak kare WebP
 *     master: dpi 0, "RGB", alfa yok; en büyük türev w1280 WebP: sRGB, dpi 0.
 *   - /files/98/988c22f07137dd72181b088abce70f38.tif → 300 DPI, Adobe RGB.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));

/** Anahtar → Türkçe metin (vue-i18n olmadan; düz yol çözümü). */
function tFrom(messages) {
  return (key) => key.split(".").reduce((o, k) => (o == null ? o : o[k]), messages) ?? key;
}
const t = tFrom(tr);

test("kare WebP master: DPI 'Dosyada yok', renk 'RGB (profilsiz)', alfa 'Yok'", () => {
  const src = sourceFacts({ status: "ok", dpi: 0, colorspace: "RGB", has_alpha: false }, t);
  const res = renditionFacts({ dpi: 0, colorspace: "sRGB", hasAlpha: false }, t);

  const [dpi, renk, alfa] = factRows(src, res, t);

  assert.equal(dpi.key, "dpi");
  assert.equal(dpi.source, "Dosyada yok");
  assert.match(dpi.sourceTitle, /DPI bilgisi taşımıyor/);
  assert.equal(dpi.result, "Dosyada yok");
  assert.equal(renk.source, "RGB (profilsiz)");
  assert.match(renk.sourceTitle, /ICC/);
  assert.equal(renk.result, "sRGB");
  assert.equal(alfa.source, "Yok");
  assert.equal(alfa.result, "Yok");
  // Hiçbir hücre "—" değil: üçü de ölçüldü.
  for (const r of [dpi, renk, alfa]) {
    assert.notEqual(r.source, DASH);
    assert.notEqual(r.result, DASH);
  }
});

test("ölçülmüş DPI sayı olarak, ICC adı olduğu gibi yazılır", () => {
  const src = sourceFacts({ status: "ok", dpi: 300, colorspace: "Adobe RGB", has_alpha: true }, t);
  const [dpi, renk, alfa] = factRows(src, renditionFacts(null, t), t);

  assert.equal(dpi.source, "300");
  assert.equal(renk.source, "Adobe RGB");
  assert.equal(alfa.source, "Var");
  // Türev yoksa sonuç sütunu "—" (üretim yok = ölçüm yok).
  assert.equal(dpi.result, DASH);
  assert.equal(renk.result, DASH);
  assert.equal(alfa.result, DASH);
});

test("'—' yalnız okunamayan / eksik / ölçülmemiş dosyada ve nedeni title'da", () => {
  const eksik = factRows(
    sourceFacts({ status: "missing" }, t),
    renditionFacts({ colorspace: "" }, t),
    t
  );
  assert.equal(eksik[0].source, DASH);
  assert.equal(eksik[0].sourceTitle, "Dosya diskte yok");
  assert.equal(eksik[0].result, DASH);
  assert.equal(eksik[0].resultTitle, "Henüz ölçülmedi");

  const bozuk = factRows(sourceFacts({ status: "unreadable" }, t), renditionFacts(null, t), t);
  assert.equal(bozuk[1].source, DASH);
  assert.equal(bozuk[1].sourceTitle, "Dosya okunamadı");
});

test("gri ve CMYK kipleri okunur adla", () => {
  const gri = factRows(
    sourceFacts({ status: "ok", dpi: 72, colorspace: "Gray" }, t),
    renditionFacts(null, t),
    t
  );
  assert.equal(gri[1].source, "Gri tonlama");
  const cmyk = factRows(
    sourceFacts({ status: "ok", dpi: 300, colorspace: "CMYK" }, t),
    renditionFacts(null, t),
    t
  );
  assert.equal(cmyk[1].source, "CMYK");
});

test("dört dilde künye anahtarları eksiksiz", () => {
  const anahtarlar = [
    "dpiNone",
    "dpiNoneHint",
    "untaggedRgb",
    "untaggedRgbHint",
    "gray",
    "alphaYes",
    "alphaNo",
    "unreadable",
    "missing",
    "notMeasured",
  ];
  for (const [dil, mesaj] of Object.entries({ tr, en, ru, ar })) {
    for (const k of anahtarlar) {
      const v = tFrom(mesaj)(`media.quality.facts.${k}`);
      assert.ok(v && v !== `media.quality.facts.${k}`, `${dil}: media.quality.facts.${k} eksik`);
    }
  }
});

test("panel sabit '—' satırlarını bıraktı, künyeyi qualityFacts'ten alıyor", () => {
  const panel = readFileSync(`${frontendRoot}/src/components/media/MediaQualityPanel.vue`, "utf8");
  assert.doesNotMatch(panel, /\{ key: "dpi", source: DASH, result: DASH \}/);
  assert.doesNotMatch(panel, /karşılığı YOK/);
  assert.match(panel, /factRows\(sourceFacts\(source\.value, t\), renditionFacts\(l, t\), t\)/);
});
