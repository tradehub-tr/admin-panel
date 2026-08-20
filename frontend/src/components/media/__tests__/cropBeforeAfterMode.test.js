import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { renderToString } from "@vue/server-renderer";

import tr from "../../../i18n/locales/tr.js";
import en from "../../../i18n/locales/en.js";
import { rect } from "../../../lib/media/crop/geometry.js";

/**
 * T-105 D3 — ÖNCE/SONRA ve Otomatik/Manuel kip, sunucu çıktısında yapısal.
 *
 *   ÖLÇÜLÜR  — iki bileşenin de "önce" ve "sonra" / iki kipi BASTIĞI, oran
 *              zorlaması varken uyarının, yokken "aynı" satırının çıktığı,
 *              seçili kipin `aria-checked` taşıdığı ve dört dilde ham anahtar
 *              düşmediği.
 *   ÖLÇÜLMEZ — gerçek tıklama, canvas çizimi, görsel karşılaştırma. Bunlar
 *              canlı tarayıcı ister; bu görevde YAPILMADI.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
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

const i18n = (locale = "tr", messages = { tr, en }) =>
  createI18n({ legacy: false, locale, fallbackLocale: "tr", messages });

async function render(path, props, locale, messages) {
  const { default: Component } = await server.ssrLoadModule(path);
  const app = createSSRApp({ render: () => h(Component, props) });
  app.use(i18n(locale, messages));
  return renderToString(app);
}

const BEFORE_AFTER = "/src/components/media/crop/CropBeforeAfter.vue";
const MODE_TOGGLE = "/src/components/media/crop/CropModeToggle.vue";

const baProps = {
  bitmap: null,
  sourceW: 4000,
  sourceH: 3000,
  beforeWin: rect(0, 0, 4000, 3000),
  afterWin: rect(0, 374, 4000, 2252),
  beforePx: [0, 0, 4000, 3000],
  afterPx: [0, 374, 4000, 2252],
  ratioForced: true,
  targetLabel: "16:9",
};

// ── Önce / Sonra ──────────────────────────────────────────────────

test("önce ve sonra bileşende AYRI AYRI basılıyor", async () => {
  const html = await render(BEFORE_AFTER, baProps);
  assert.ok(html.includes("Önce"), "önce etiketi yok");
  assert.ok(html.includes("Sonra"), "sonra etiketi yok");
  // İki tuval — biri önce, biri sonra.
  assert.equal((html.match(/<canvas/g) || []).length, 2, "iki tuval olmalı");
  // Boyut etiketleri iki kutuyu da söylüyor.
  assert.ok(html.includes("4000×3000"), "önce boyutu");
  assert.ok(html.includes("4000×2252"), "sonra boyutu");
});

test("oran zorlanınca kullanıcı KAYDETMEDEN uyarılıyor", async () => {
  const html = await render(BEFORE_AFTER, baProps);
  assert.ok(html.includes("Oran"), "oran zorlaması uyarısı yok");
  assert.ok(html.includes("16:9"), "hedef oran etiketi görünmeli");
  assert.ok(html.includes("kaydedilecek kadraj seçtiğinden farklı"), "sürpriz uyarısı yok");
});

test("oran uyumluysa 'aynı' denir, yanlış uyarı basılmaz", async () => {
  const html = await render(BEFORE_AFTER, {
    ...baProps,
    afterWin: rect(0, 0, 4000, 3000),
    afterPx: [0, 0, 4000, 3000],
    ratioForced: false,
  });
  assert.ok(html.includes("sonra = önce"), "uyumlu durum söylenmeli");
  assert.ok(!html.includes("seçtiğinden farklı"), "uyumluyken sürpriz uyarısı olmamalı");
});

// ── Otomatik / Manuel kip ─────────────────────────────────────────

test("kip seçici iki radyo düğmesi — Otomatik ve Manuel", async () => {
  const html = await render(MODE_TOGGLE, { mode: "manual" });
  assert.match(html, /role="radiogroup"/);
  assert.equal((html.match(/role="radio"/g) || []).length, 2, "iki kip düğmesi");
  assert.ok(html.includes("Otomatik"));
  assert.ok(html.includes("Manuel"));
});

test("seçili kip aria-checked taşır — Otomatik seçili", async () => {
  const html = await render(MODE_TOGGLE, { mode: "auto" });
  assert.equal((html.match(/aria-checked="true"/g) || []).length, 1, "tek kip seçili");
  // Otomatik chip'i seçili: onun yanındaki metin "Otomatik".
  assert.match(html, /aria-checked="true"[^>]*>[\s\S]*?Otomatik/);
});

test("Manuel seçiliyken Manuel işaretli", async () => {
  const html = await render(MODE_TOGGLE, { mode: "manual" });
  assert.equal((html.match(/aria-checked="true"/g) || []).length, 1);
  assert.match(html, /aria-checked="true"[^>]*>[\s\S]*?Manuel/);
});

test("otomatik kipin bir öneri OLDUĞU söylenir — 'yüz bulundu' DEMEZ", async () => {
  const html = await render(MODE_TOGGLE, { mode: "auto" });
  const gorunen = html.replace(/<!--[\s\S]*?-->/g, "");
  assert.ok(gorunen.includes("öneri"), "otomatik kipin öneri olduğu söylenmeli");
  // Metin "yüz/nesne tespiti DEĞİL" diyebilir (negatif); yasak olan POZİTİF
  // tespit iddiasıdır — "yüz bulundu" / "face found" gibi.
  assert.ok(!/yüz bulundu|face (found|detected)/i.test(gorunen), "yüz tespiti iddiası olmamalı");
  assert.ok(/tespiti değil|not .*detection/i.test(gorunen), "önerinin tespit OLMADIĞI söylenmeli");
});

// ── i18n dört dil paritesi ────────────────────────────────────────

test("iki bileşen de dört dilde ham anahtar düşürmüyor", async () => {
  const langs = await Promise.all(
    ["tr", "en", "ru", "ar"].map((l) =>
      import(`../../../i18n/locales/${l}.js`).then((m) => [l, m.default])
    )
  );
  for (const [lang, msgs] of langs) {
    const ba = await render(BEFORE_AFTER, baProps, lang, { [lang]: msgs });
    const mt = await render(MODE_TOGGLE, { mode: "auto" }, lang, { [lang]: msgs });
    for (const [name, html] of [["beforeAfter", ba], ["modeToggle", mt]]) {
      assert.ok(
        !html.includes("cropStudio.beforeAfter.") && !html.includes("cropStudio.mode."),
        `${lang} · ${name}: ham anahtar ekrana düştü`
      );
    }
  }
});
