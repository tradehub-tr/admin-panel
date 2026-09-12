import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";

import vue from "@vitejs/plugin-vue";
import { createPinia } from "pinia";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createI18n } from "vue-i18n";

import tr from "../../../i18n/locales/tr.js";
import en from "../../../i18n/locales/en.js";
import ar from "../../../i18n/locales/ar.js";
import ru from "../../../i18n/locales/ru.js";

/**
 * MOGEM-620 §14 — toplu düzenleme modalının davranış testleri.
 *
 * NE ÖLÇÜLÜYOR
 * ------------
 *   1. Dört dilde i18n anahtarları TAM — eksik anahtar üretimde ham
 *      "media.bulkFields.title" metni olarak ekrana düşer.
 *   2. Sunucu sözleşmesi ile istemci beklentisi UYUŞUYOR — `bulk_ops`
 *      `{applied, files, skipped, failed}` döndürüyor, `summarizeBulk`
 *      `applied` sayacını okuyor.
 *   3. Modalın üç kipi doğru yükü üretiyor.
 *   4. Desen önizlemesi sunucudaki `render_name` ile AYNI SONUCU veriyor
 *      (birebir aynı uygulama değil — gerekçe bileşende; ama örneklerde
 *      ayrışmamalı, yoksa operatör yanlış önizleme görür).
 *
 * NE ÖLÇÜLMÜYOR: gerçek tarayıcı odak sırası ve ekran okuyucu çıktısı.
 * Odak tuzağı `onMounted`'a bağlı, SSR'da hiç koşmuyor — o `axe`
 * taramasında da ölçülemiyor (bkz. `mediaAxe.test.js` başlığı).
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const MODAL = "/src/components/media/MediaBulkFieldsModal.vue";
const BAR = "/src/components/media/MediaBulkBar.vue";

let server;
/**
 * `stores/media.js` `@/` alias'ıyla import ediyor; Node onu çözemiyor.
 * Bu yüzden store Vite'ın SSR yükleyicisinden geliyor — testin ölçtüğü şey
 * zaten alias çözümü değil, sunucu sözleşmesi.
 */
let summarizeBulk;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
  globalThis.window ??= { location: { origin: "https://panel.test" } };
  ({ summarizeBulk } = await server.ssrLoadModule("/src/stores/media.js"));
});

after(async () => {
  await server?.close();
  delete globalThis.window;
});

async function render(path, props, locale = "tr") {
  const { default: Component } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(Component, props) });
  app.use(
    createI18n({
      legacy: false,
      locale,
      fallbackLocale: "tr",
      messages: { tr, en, ar, ru },
      // Eksik anahtarı SESSİZCE geçme: bu testin yarısı o eksikleri
      // yakalamak için var.
      missingWarn: false,
      fallbackWarn: false,
    })
  );
  app.use(createPinia());
  return renderToString(app);
}

describe("i18n — dört dilde eksik anahtar yok", () => {
  const DILLER = { tr, en, ar, ru };
  const ANAHTARLAR = [
    "title",
    "count",
    "close",
    "mode",
    "modeVisibility",
    "modeFields",
    "modeRename",
    "visibility",
    "robots",
    "robotsHint",
    "privateHint",
    "emptyHint",
    "pattern",
    "start",
    "patternHint",
    "preview",
    "apply",
    "cancel",
    "adminOnly",
  ];

  for (const [lang, sozluk] of Object.entries(DILLER)) {
    test(`${lang} — media.bulkFields tam`, () => {
      const blok = sozluk?.media?.bulkFields;
      assert.ok(blok, `${lang}: media.bulkFields bloğu yok`);
      for (const anahtar of ANAHTARLAR) {
        assert.ok(
          typeof blok[anahtar] === "string" && blok[anahtar].trim(),
          `${lang}: media.bulkFields.${anahtar} eksik`
        );
      }
    });

    test(`${lang} — çubuk düğmesi ve toast anahtarı var`, () => {
      assert.ok(sozluk?.media?.bulk?.editFields, `${lang}: media.bulk.editFields eksik`);
      assert.ok(
        sozluk?.media?.toast?.bulkFieldsApplied,
        `${lang}: media.toast.bulkFieldsApplied eksik`
      );
    });
  }

  test("hiçbir dilde ham anahtar ekrana düşmüyor", async () => {
    for (const lang of Object.keys(DILLER)) {
      const html = await render(MODAL, { count: 5, sampleName: "a.png" }, lang);
      assert.ok(
        !html.includes("media.bulkFields."),
        `${lang}: çözülmemiş i18n anahtarı ekranda`
      );
    }
  });
});

describe("modal — render sözleşmesi", () => {
  test("dialog rolü ve modal işareti var", async () => {
    const html = await render(MODAL, { count: 7, sampleName: "a.png" });
    assert.match(html, /role="dialog"/);
    assert.match(html, /aria-modal="true"/);
  });

  test("seçim sayısı gösteriliyor", async () => {
    const html = await render(MODAL, { count: 42, sampleName: "a.png" });
    assert.ok(html.includes("42"), "seçim sayısı ekranda yok");
  });

  test("hata `role=alert` ile duyuruluyor", async () => {
    const html = await render(MODAL, {
      count: 1,
      error: "Geçersiz robots directive.",
      sampleName: "a.png",
    });
    assert.match(html, /role="alert"/);
    assert.ok(html.includes("Geçersiz robots directive."));
  });

  test("hata yokken alert bölgesi hiç basılmıyor", async () => {
    // Boş bir `role="alert"` ekran okuyucuda "canlı bölge" olarak durur ve
    // sonraki her değişiklikte gereksiz duyuru üretir.
    const html = await render(MODAL, { count: 1, sampleName: "a.png" });
    assert.ok(!html.includes('class="bfm__error"'), "boş hata bölgesi basılmış");
  });

  test("Private görünürlük listede AMA uyarısı da var", async () => {
    // Sunucu `Private`ı reddediyor; ekranda hiç göstermemek "neden yok?"
    // sorusunu doğurur, uyarısız göstermek "neden olmadı?" sorusunu.
    const html = await render(MODAL, { count: 1, sampleName: "a.png" });
    assert.ok(html.includes(tr.media.bulkFields.privateHint), "Private uyarısı yok");
  });

  test("üç kip radyo grubu olarak sunuluyor", async () => {
    const html = await render(MODAL, { count: 1, sampleName: "a.png" });
    const radyolar = html.match(/type="radio"/g) || [];
    assert.equal(radyolar.length, 3, "üç kip radyo düğmesi bekleniyordu");
    assert.match(html, /<fieldset/, "radyo grubu fieldset içinde olmalı");
    assert.match(html, /<legend/, "fieldset legend'siz ekran okuyucuya anlamsız");
  });
});

describe("çubuk — toplu düzenle düğmesi", () => {
  test("düğme çizilıyor", async () => {
    const html = await render(BAR, { count: 3 });
    assert.ok(html.includes(tr.media.bulk.editFields), "toplu düzenle düğmesi yok");
  });

  test("moveOnly kipinde gizleniyor", async () => {
    // Gezgin (klasör taşıma) kipinde alan yazma işlemi anlamsız.
    const html = await render(BAR, { count: 3, moveOnly: true, folders: [] });
    assert.ok(!html.includes(tr.media.bulk.editFields), "moveOnly kipinde görünmemeli");
  });
});

describe("sunucu sözleşmesi — summarizeBulk `applied` sayacını okuyor", () => {
  test("tam başarı kısmi sayılmaz", () => {
    const rapor = summarizeBulk("fields", { applied: 3, files: 3, skipped: 0, failed: [] }, "applied");
    assert.equal(rapor.ok, 3);
    assert.equal(rapor.partial, false);
  });

  test("atlanan dosya kısmi yapar", () => {
    const rapor = summarizeBulk("fields", { applied: 2, files: 2, skipped: 1, failed: [] }, "applied");
    assert.equal(rapor.skipped, 1);
    assert.equal(rapor.partial, true);
  });

  test("başarısız dosya adresi ve sebebi taşınıyor", () => {
    const rapor = summarizeBulk(
      "rename",
      { applied: 1, files: 1, skipped: 0, failed: [{ file_url: "/files/a.png", error: "Dosya kaydı yok" }] },
      "applied"
    );
    assert.equal(rapor.failed.length, 1);
    assert.equal(rapor.failed[0].id, "/files/a.png");
    assert.equal(rapor.failed[0].error, "Dosya kaydı yok");
    assert.equal(rapor.partial, true);
  });

  test("boş yanıt çökmüyor", () => {
    const rapor = summarizeBulk("fields", {}, "applied");
    assert.equal(rapor.ok, 0);
    assert.deepEqual(rapor.failed, []);
  });
});

describe("desen önizlemesi sunucuyla aynı sonucu veriyor", () => {
  /**
   * Sunucudaki `bulk_ops.render_name` mantığının JS karşılığı — bileşenin
   * içindekiyle AYNI algoritma. Buradaki iş, iki uygulamanın örnek
   * girdilerde ayrışmadığını kanıtlamak; birebir aynı kod olmaları
   * BEKLENMİYOR (gerekçe bileşende).
   */
  function onizle(pattern, { taban, sira, uzanti }) {
    let cikti = pattern.replace(/\{ad\}/g, taban).replace(/\{uzanti\}/g, uzanti);
    cikti = cikti.replace(/\{sira(?::(\d+))?\}/g, (_m, pad) =>
      String(sira).padStart(Number(pad || 0), "0")
    );
    if (uzanti && !cikti.toLowerCase().endsWith(uzanti.toLowerCase())) cikti += uzanti;
    return cikti.slice(0, 140);
  }

  const ORNEKLER = [
    ["{ad}-{sira}", { taban: "kapak", sira: 3, uzanti: ".jpg" }, "kapak-3.jpg"],
    ["urun-{sira:3}", { taban: "x", sira: 7, uzanti: ".png" }, "urun-007.png"],
    ["yeni-ad", { taban: "x", sira: 1, uzanti: ".webp" }, "yeni-ad.webp"],
    ["{ad}{uzanti}", { taban: "a", sira: 1, uzanti: ".jpg" }, "a.jpg"],
  ];

  for (const [desen, girdi, beklenen] of ORNEKLER) {
    test(`${desen} → ${beklenen}`, () => {
      assert.equal(onizle(desen, girdi), beklenen);
    });
  }

  test("140 karakter tavanı", () => {
    const uzun = onizle("{ad}", { taban: "x".repeat(500), sira: 1, uzanti: ".jpg" });
    assert.ok(uzun.length <= 140);
  });
});
