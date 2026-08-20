import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { renderToString } from "@vue/server-renderer";

import ar from "../../../../i18n/locales/ar.js";
import en from "../../../../i18n/locales/en.js";
import ru from "../../../../i18n/locales/ru.js";
import tr from "../../../../i18n/locales/tr.js";
import {
  DEVICES,
  PRIMARY_REGIONS,
  simulate,
  renditionsFor,
} from "../../../../lib/media/simulator/index.js";

/**
 * Önizleme simülatörü ekranı — erişilebilirlik ve dürüstlük sözleşmesi.
 *
 *   ÖLÇÜLDÜ  — sunucu çıktısındaki ARIA sözleşmesi (radiogroup + dolaşan
 *              tabindex, canlı bölge, tablo başlık semantiği), klavye tuş
 *              haritasının kaynakta varlığı, boş `Media Rendition` durumunun
 *              birinci sınıf oluşu, uydurma uç YOKLUĞU, dört dilde metin.
 *   ÖLÇÜLMEDİ — gerçek ekran okuyucu (NVDA/VoiceOver), tarayıcıdaki gerçek
 *              odak halkası ve Tab sırası, renk kontrastı, RTL'de yatay ok
 *              davranışı. Bu görevde tarayıcı doğrulaması YAPILMADI.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const frontendRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const read = (rel) => readFileSync(`${frontendRoot}/${rel}`, "utf8");

const OPTION_GROUP = "/src/components/media/simulator/SimOptionGroup.vue";
const RESULT = "/src/components/media/simulator/SimResultCard.vue";
const MATRIX = "/src/components/media/simulator/SimMatrixTable.vue";
const POSTER = "/src/components/media/simulator/SimPosterCard.vue";

const optionGroupSrc = readFileSync(`${HERE}../SimOptionGroup.vue`, "utf8");
const viewSrc = read("src/views/system/MediaSimulatorView.vue");
const composableSrc = read("src/composables/useSrcsetSimulator.js");

let server;

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
});

after(async () => {
  await server?.close();
});

const i18n = (locale = "tr") =>
  createI18n({ legacy: false, locale, fallbackLocale: "tr", messages: { tr, en, ar, ru } });

async function render(path, props, locale) {
  const { default: Component } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(Component, props) });
  app.use(i18n(locale));
  return renderToString(app);
}

const ladder = renditionsFor("product.image", 2160);
const selection = simulate(DEVICES[0], PRIMARY_REGIONS[0], ladder);

// ── 1. Cihaz / yerleşim seçimi klavyeyle kullanılabilir ───────────

const options = [
  { id: "a", label: "Cihaz A", hint: "375×667", group: "phone" },
  { id: "b", label: "Cihaz B", hint: "390×844", group: "phone" },
  { id: "c", label: "Cihaz C", hint: "1440×900", group: "laptop" },
];

test("seçim listesi radiogroup ve seçenekler role=radio", async () => {
  const html = await render(OPTION_GROUP, { options, label: "Cihaz", modelValue: "b" });
  assert.match(html, /role="radiogroup"/, "grup radiogroup olmalı");
  assert.equal((html.match(/role="radio"/g) || []).length, 3, "her seçenek radio");
  assert.match(html, /aria-checked="true"/, "seçili olan işaretli");
  assert.equal((html.match(/aria-checked="true"/g) || []).length, 1, "tek seçim");
});

test("grup tek Tab durağı — dolaşan tabindex kurulu", async () => {
  const html = await render(OPTION_GROUP, { options, label: "Cihaz", modelValue: "b" });
  assert.equal((html.match(/tabindex="0"/g) || []).length, 1, "yalnız aktif seçenek Tab durağı");
  assert.equal((html.match(/tabindex="-1"/g) || []).length, 2, "diğerleri Tab dışı");
});

test("seçim listede yoksa grup Tab sırasından DÜŞMEZ", async () => {
  // Boş/uyumsuz model ile de bir durak kalmalı; yoksa klavye kullanıcısı
  // gruba hiç giremez.
  const html = await render(OPTION_GROUP, { options, label: "Cihaz", modelValue: "" });
  assert.equal((html.match(/tabindex="0"/g) || []).length, 1);
});

test("ok tuşları, Home ve End kaynakta bağlı", () => {
  for (const key of ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"]) {
    assert.match(optionGroupSrc, new RegExp(key), `${key} işlenmiyor`);
  }
  assert.match(optionGroupSrc, /@keydown/, "keydown bağlı değil");
  assert.match(optionGroupSrc, /preventDefault/, "ok tuşu sayfayı kaydırmamalı");
  // RTL'de yatay oklar ters çevrilmeli — Arapça arayüz destekleniyor.
  assert.match(optionGroupSrc, /dir === "rtl"/, "RTL ok yönü ele alınmamış");
});

test("grup başlıklı ama başlık ekran okuyucuya iki kez okunmuyor", async () => {
  const html = await render(OPTION_GROUP, { options, label: "Cihaz", modelValue: "a" });
  assert.match(html, /aria-labelledby="/, "grubun erişilebilir adı olmalı");
  assert.match(html, /aria-hidden="true"/, "görsel grup başlığı gizlenmeli");
});

// ── 2. Sonuç canlı bölgede duyurulur ──────────────────────────────

test("sonuç aria-live ile duyuruluyor", async () => {
  const html = await render(RESULT, { selection, sizes: "100vw", srcset: "a 96w" });
  assert.match(html, /aria-live="polite"/, "canlı bölge yok");
  assert.match(html, /role="status"/);
  // Duyuru cümlesi gerçekten sayı taşımalı — boş bir canlı bölge işe yaramaz.
  assert.match(html, new RegExp(String(selection.requiredPx)));
  assert.match(html, new RegExp(selection.chosen.name));
});

test("matris kapsamı değişince toplam da canlı duyuruluyor", () => {
  assert.match(viewSrc, /aria-live="polite"/);
  assert.match(viewSrc, /mediaSimulator\.summary\.line/);
});

test("uyarısız kombinasyon sessiz kalmıyor, açıkça 'uyarı yok' diyor", async () => {
  const clean = simulate(DEVICES[0], PRIMARY_REGIONS[0], ladder);
  assert.deepEqual(clean.warnings, [], "bu kombinasyon uyarısız olmalı");
  const html = await render(RESULT, { selection: clean, sizes: "", srcset: "" });
  assert.match(html, /mediaSimulator\.result\.clean|uyarı yok/i);
});

// ── 3. Tablolar tablo semantiğinde ────────────────────────────────

test("matris tablosu satır/sütun başlıklı", async () => {
  const rows = DEVICES.slice(0, 3).map((d) => simulate(d, PRIMARY_REGIONS[0], ladder));
  const summary = { total: 3, sourceInsufficient: 0, overshoot: 0, zoomInsufficient: 0 };
  const html = await render(MATRIX, { rows, summary, activeKey: rows[0].key });
  assert.match(html, /<caption/, "tablo altyazısı olmalı");
  assert.equal((html.match(/scope="col"/g) || []).length, 6);
  assert.equal((html.match(/scope="row"/g) || []).length, 3);
  assert.match(html, /aria-current="true"/, "seçili satır işaretlenmeli");
});

// ── 4. Boş `Media Rendition` durumu BİRİNCİ SINIF ─────────────────

test("türev üretilmemişken hedef genişlik gösterilir, hata basılmaz", async () => {
  const html = await render(RESULT, {
    selection,
    sizes: "",
    srcset: "",
    probeState: "empty",
  });
  assert.match(html, /Media Rendition/, "boşluğun sebebi yazılmalı");
  assert.match(html, new RegExp(String(selection.chosen.width)), "hedef genişlik gösterilmeli");
  assert.doesNotMatch(html, /simres__probe--warn/, "boş durum arıza tonunda olmamalı");
});

test("yetki reddi ve arıza ayrı durumlar — biri diğerinin yerine geçmiyor", () => {
  for (const state of ["denied", "failed", "loading", "found", "empty"]) {
    assert.match(composableSrc, new RegExp(`PROBE_${state.toUpperCase()}`), state);
  }
  assert.match(composableSrc, /403/, "yetki reddi ayrıştırılmalı");
});

// ── 5. Uydurma uç YOK ─────────────────────────────────────────────

test("simülatör yalnız genel REST kaynağını okuyor, uç uydurmuyor", () => {
  assert.match(composableSrc, /api\.getList\("Media Rendition"/);
  assert.doesNotMatch(composableSrc, /callMethod|api\/method/, "özel uç çağrısı olmamalı");
  assert.doesNotMatch(viewSrc, /callMethod|api\/method|fetch\(/);
});

test("video posteri için uç uydurulmamış ve vekil kutu ÖLÇÜLMEDİ diye işaretli", async () => {
  const html = await render(POSTER, { devices: DEVICES, activeDeviceId: DEVICES[0].id });
  assert.match(html, /ÖLÇÜLMEDİ/, "vekil kutu ölçüm durumu yazılmalı");
  assert.equal((html.match(/scope="row"/g) || []).length, 13, "13 cihaz");
  const src = readFileSync(`${HERE}../SimPosterCard.vue`, "utf8");
  assert.doesNotMatch(src, /api\.|fetch\(/, "poster ucu yok, istek atılmamalı");
});

// ── 6. Ölçülmemiş veri saklanmıyor ────────────────────────────────

test("cihaz ve yerleşim verisinin ölçüm durumu ekranın üstünde", async () => {
  assert.match(viewSrc, /DEVICE_MEASUREMENT/);
  assert.match(viewSrc, /PLACEMENT_MEASUREMENT/);
  assert.match(viewSrc, /EXCLUDED_REGIONS/, "ölçülemeyen bölgeler gizlenmemeli");
});

// ── 7. Dört dil ───────────────────────────────────────────────────

test("mediaSimulator metinleri dört dilde de var", () => {
  const langs = { tr, en, ar, ru };
  const walk = (obj, prefix = "") =>
    Object.entries(obj).flatMap(([k, v]) =>
      typeof v === "object" && v !== null ? walk(v, `${prefix}${k}.`) : [`${prefix}${k}`]
    );
  const reference = walk(tr.mediaSimulator).sort();
  assert.ok(reference.length > 50, `beklenen anahtar sayısı düşük: ${reference.length}`);
  for (const [lang, messages] of Object.entries(langs)) {
    assert.ok(messages.mediaSimulator, `${lang}: mediaSimulator bloğu yok`);
    assert.deepEqual(walk(messages.mediaSimulator).sort(), reference, `${lang}: anahtarlar eksik`);
    assert.ok(messages.nav.item.mediaSimulator, `${lang}: menü çevirisi yok`);
  }
});

test("uyarı kodlarının dördü de dört dilde karşılanıyor", () => {
  const codes = ["kaynak_yetersiz", "asiri_servis", "zoom_yetersiz", "profil_yok"];
  for (const [lang, messages] of Object.entries({ tr, en, ar, ru })) {
    for (const code of codes) {
      assert.ok(messages.mediaSimulator.warn[code], `${lang}: warn.${code} yok`);
      assert.ok(messages.mediaSimulator.warnShort[code], `${lang}: warnShort.${code} yok`);
    }
  }
});

// ── 8. Yönlendirme ────────────────────────────────────────────────

test("route Media Superadmin kapısının arkasında ve menüde", () => {
  const router = read("src/router/index.js");
  const i = router.indexOf('path: "media-simulator"');
  assert.ok(i > 0, "route yok");
  const block = router.slice(i, i + 400);
  assert.match(block, /requiresSuperAdmin: true/, "ekran süper admin kapısında olmalı");
  assert.match(read("src/data/navigation.js"), /nav\.item\.mediaSimulator/);
});
