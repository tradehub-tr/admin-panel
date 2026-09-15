import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, afterEach, before, test } from "node:test";

import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";
import { createSSRApp, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { renderToString } from "@vue/server-renderer";
import { createI18n } from "vue-i18n";

import tr from "../../../i18n/locales/tr.js";

/**
 * AD-3 / AC-12 — SubscriptionPaymentsView "İptal Planlı & Ödemesi Geciken
 * Mağazalar" bölümü SSR render sözleşmesi.
 *
 *   ÖLÇÜLÜR  — iki tablo (iptal planlı + dunning) satır içerikleri
 *              (mağaza adı, paket, sebep etiketi, tarihler, durum rozeti),
 *              sebep dağılımı chip'leri (sayaçlarla), bilinmeyen sebep
 *              kodunun ham koda düşmesi, boş bloklarda "yok" metinleri.
 *   ÖLÇÜLMEZ — istek/tıklama (SSR'de onMounted koşmaz — billingCycleSelector
 *              deseni); veri initialAttention tohumuyla verilir. Yetki (403)
 *              backend'in only_for katmanıdır, burada ölçülmez.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const VIEW = "/src/views/billing/SubscriptionPaymentsView.vue";

const WEB_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15";

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");

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

const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
const originalWindow = globalThis.window;
afterEach(() => {
  if (hadWindow) globalThis.window = originalWindow;
  else delete globalThis.window;
});

async function render(props) {
  globalThis.window = { navigator: { userAgent: WEB_UA } };
  try {
    const { default: Component } = await server.ssrLoadModule(VIEW);
    const pinia = createPinia();
    setActivePinia(pinia);
    const app = createSSRApp({ render: () => h(Component, props) });
    app.use(pinia);
    app.use(createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr } }));
    app.use(
      createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/:pathMatch(.*)*", component: { render: () => null } }],
      })
    );
    return stripComments(await renderToString(app, {}));
  } finally {
    if (hadWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
  }
}

// Zaman-bombası denetimi gereği gelecek tarih SABİT yazılamaz; koşuma göre
// ileri tarihler hesaplanır (assertion'lar tarih metnine bağlı değil).
const gunSonra = (n) =>
  `${new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)} 00:00:00`;

const ATTENTION = {
  cancellations: [
    {
      store: "store-a",
      store_name: "Aslan Ticaret",
      plan: "PRO",
      cancellation_reason: "fiyat",
      cancel_requested_at: "2026-09-01 10:00:00",
      current_period_end: gunSonra(20),
    },
    {
      store: "store-b",
      store_name: "Bora Elektronik",
      plan: "START",
      cancellation_reason: "ozel_kod",
      cancel_requested_at: "2026-08-20 09:00:00",
      current_period_end: gunSonra(5),
    },
  ],
  dunning: [
    {
      store: "store-c",
      store_name: "Ceyhan Gıda",
      plan: "PRO",
      status: "past_due",
      current_period_end: "2026-09-05 00:00:00",
      suspended_at: null,
    },
    {
      store: "store-d",
      store_name: "Demir Hırdavat",
      plan: "START",
      status: "suspended",
      current_period_end: "2026-08-25 00:00:00",
      suspended_at: "2026-09-08 03:00:00",
    },
  ],
  reason_breakdown: { fiyat: 1, ozel_kod: 1 },
};

// ── Dolu liste: iki tablo + chip'ler ──

test("bölüm başlığı + iki tablo satır içerikleriyle çizilir", async () => {
  const html = await render({ initialAttention: ATTENTION });
  assert.ok(html.includes("İptal Planlı"), "bölüm başlığı görünmeli");
  assert.ok(html.includes("Ödemesi Geciken Mağazalar"), "bölüm başlığı tam olmalı");

  // İptal planlı tablosu
  assert.ok(html.includes("Aslan Ticaret") && html.includes("Bora Elektronik"), "mağaza adları");
  assert.ok(html.includes("Fiyat bana uygun değil"), "sebep kodu ankete uygun etikete çevrilir");
  assert.ok(html.includes("01 Eylül 2026"), "iptal talep tarihi okunur biçimde basılır");
  assert.ok(html.includes("Dönem sonu (fesih)"), "fesih tarihi kolonu var");

  // Dunning tablosu
  assert.ok(html.includes("Ceyhan Gıda") && html.includes("Demir Hırdavat"), "dunning mağazaları");
  assert.ok(html.includes("Ödeme gecikti"), "past_due rozeti");
  assert.ok(html.includes("Askıda"), "suspended rozeti");
  assert.ok(html.includes("08 Eylül 2026"), "askı tarihi okunur biçimde basılır");
});

test("sebep dağılımı chip'leri sayaçlarla; bilinmeyen kod ham koda düşer", async () => {
  const html = await render({ initialAttention: ATTENTION });
  assert.ok(html.includes("İptal sebebi dağılımı"), "chip grubu erişilebilir adla çizilir");
  assert.ok(html.includes("Fiyat bana uygun değil"), "bilinen kod etiketlenir");
  assert.ok(
    html.includes("ozel_kod"),
    "sözlükte olmayan kod ham haliyle görünür (sessiz kayıp yok)"
  );
});

// ── Boş bloklar ──

test("boş bloklar: 'yok' metinleri, chip grubu çizilmez", async () => {
  const html = await render({
    initialAttention: { cancellations: [], dunning: [], reason_breakdown: {} },
  });
  assert.ok(html.includes("İptal planlı mağaza yok."), "boş iptal bloğu metni");
  assert.ok(html.includes("Ödemesi geciken mağaza yok."), "boş dunning bloğu metni");
  assert.ok(!html.includes("İptal sebebi dağılımı"), "sebep yokken chip grubu olmamalı");
});

// ── Tohumsuz SSR: yükleme durumu (regresyon — bölüm her zaman mevcut) ──

test("tohumsuz SSR: bölüm başlığı + yükleme durumu (mevcut load deseni)", async () => {
  const html = await render(undefined);
  assert.ok(html.includes("İptal Planlı"), "bölüm iskeleti her durumda çizilir");
  assert.ok(html.includes("Yükleniyor…"), "yükleme durumu gösterilir");
});
