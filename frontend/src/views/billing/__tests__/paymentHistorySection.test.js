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
 * AD-2 / AC-6..7 + E2 — ödeme geçmişi bölümü SSR render sözleşmesi.
 *
 *   ÖLÇÜLÜR  — tablo satırları (plan/döngü/tutar/durum rozeti/tarih), açık
 *              satırın makbuz detayı (referans kodu, talep/onay tarihleri,
 *              ret sebebi), boş durum, hata durumunda bölümün SESSİZCE
 *              gizlenmesi, E2: iOS'ta pending satırın (referans kodu + tutar
 *              dahil) DOM'da HİÇ olmaması, bölüm copy'sinde satış yüzeyi
 *              bulunmaması ve Gate mount'unun hem hasSubscription hem locked
 *              durumda çizilmesi.
 *   ÖLÇÜLMEZ — tıklama/istek (SSR'de olay ve onMounted koşmaz —
 *              billingCycleSelector deseni); veri initialPayments, hata
 *              initialError, açık satır initialExpanded tohumuyla verilir.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const SECTION = "/src/components/billing/PaymentHistorySection.vue";
const GATE = "/src/views/billing/SubscriptionGateView.vue";

const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) istocApp/ios";
const WEB_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15";

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");

let server;
let useSubscriptionStore;

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
  ({ useSubscriptionStore } = await server.ssrLoadModule("/src/stores/subscription.js"));
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

async function render(path, { ua, accessState, props } = {}) {
  globalThis.window = { navigator: { userAgent: ua || WEB_UA } };
  try {
    const { default: Component } = await server.ssrLoadModule(path);
    const pinia = createPinia();
    setActivePinia(pinia);
    if (accessState !== undefined) {
      const sub = useSubscriptionStore(pinia);
      sub.state = accessState;
      sub.checked = true;
    }
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

// Zaman-bombası denetimi gereği gelecek tarih SABİT yazılamaz; geçmiş
// tarihler sabittir ve güvenlidir (gunSonra deseni yalnız gelecek için
// gerekir — bu fixture'larda gelecek tarih yok).
const gunSonra = (n) =>
  `${new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)} 00:00:00`;

const PAY_CONFIRMED = {
  name: "SPY-0001",
  plan: "PRO",
  billing_cycle: "yearly",
  amount: 4990,
  currency: "EUR",
  reference_code: "REF-OK-01",
  status: "confirmed",
  requested_at: "2026-05-02 09:15:00",
  confirmed_at: "2026-05-03 11:00:00",
  rejection_reason: "",
};

const PAY_REJECTED = {
  name: "SPY-0002",
  plan: "START",
  billing_cycle: "monthly",
  amount: 199,
  currency: "EUR",
  reference_code: "REF-RED-02",
  status: "rejected",
  requested_at: "2026-06-10 14:30:00",
  confirmed_at: null,
  rejection_reason: "Tutar eşleşmedi",
};

const PAY_PENDING = {
  name: "SPY-0003",
  plan: "PRO",
  billing_cycle: "monthly",
  amount: 777,
  currency: "EUR",
  reference_code: "REF-PEND-77",
  status: "pending",
  requested_at: "2026-09-01 08:00:00",
  confirmed_at: null,
  rejection_reason: "",
};

// ── Satırlar + makbuz detayı ──

test("web: satırlar plan/döngü/tutar/durum rozeti/tarih ile listelenir", async () => {
  const html = await render(SECTION, {
    ua: WEB_UA,
    props: { initialPayments: [PAY_PENDING, PAY_CONFIRMED, PAY_REJECTED] },
  });
  assert.ok(html.includes("Ödeme Geçmişi"), "bölüm başlığı görünmeli");
  assert.ok(html.includes("PRO") && html.includes("START"), "plan adları görünmeli");
  assert.ok(html.includes("Yıllık") && html.includes("Aylık"), "döngü etiketleri görünmeli");
  assert.ok(html.includes("4990 EUR") && html.includes("199 EUR"), "tutarlar görünmeli");
  for (const label of ["Bekliyor", "Onaylı", "Reddedildi"]) {
    assert.ok(html.includes(label), `durum rozeti eksik: ${label}`);
  }
  assert.ok(html.includes("02 Mayıs 2026"), "talep tarihi okunur biçimde basılmalı");
  assert.ok(!html.includes("REF-OK-01"), "detay kapalıyken referans kodu satırda basılmamalı");
});

test("web: açık satırın makbuz detayı — referans, talep/onay tarihleri", async () => {
  const html = await render(SECTION, {
    ua: WEB_UA,
    props: {
      initialPayments: [PAY_CONFIRMED, PAY_REJECTED],
      initialExpanded: PAY_CONFIRMED.name,
    },
  });
  assert.ok(html.includes("Referans Kodu"), "makbuzda referans etiketi olmalı");
  assert.ok(html.includes("REF-OK-01"), "açık satırın referans kodu görünmeli");
  assert.ok(html.includes("Talep tarihi") && html.includes("Onay tarihi"), "tarih etiketleri");
  assert.ok(html.includes("03 Mayıs 2026"), "onay tarihi okunur biçimde basılmalı");
  assert.ok(!html.includes("REF-RED-02"), "kapalı satırın makbuzu basılmamalı");
  assert.ok(!html.includes("Ret sebebi"), "onaylı makbuzda ret alanı olmamalı");
});

test("web: reddedilen makbuzda ret sebebi görünür, onay tarihi alanı yok", async () => {
  const html = await render(SECTION, {
    ua: WEB_UA,
    props: { initialPayments: [PAY_REJECTED], initialExpanded: PAY_REJECTED.name },
  });
  assert.ok(html.includes("Ret sebebi"), "ret etiketi görünmeli");
  assert.ok(html.includes("Tutar eşleşmedi"), "ret sebebi metni görünmeli");
  assert.ok(!html.includes("Onay tarihi"), "confirmed_at yokken onay satırı basılmamalı");
});

// ── Boş durum ──

test("boş liste: nötr boş durum metni, tablo yok", async () => {
  const html = await render(SECTION, { ua: WEB_UA, props: { initialPayments: [] } });
  assert.ok(html.includes("Ödeme Geçmişi"), "başlık boş durumda da kalır");
  assert.ok(html.includes("Henüz bir ödeme kaydınız bulunmuyor"), "boş durum metni");
  assert.ok(!html.includes("<table"), "boş durumda tablo çizilmemeli");
});

// ── Hata → bölüm sessizce gizlenir ──

test("hata (403 vb.): bölüm başlığı dahil HİÇBİR şey basılmaz", async () => {
  const html = await render(SECTION, { ua: WEB_UA, props: { initialError: true } });
  assert.ok(!html.includes("Ödeme Geçmişi"), "hatada bölüm sessizce gizlenmeli");
  assert.ok(!html.includes("<table"), "hatada tablo olmamalı");
});

test("veri yüklenmeden (tohumsuz SSR): bölüm gizli — iskelet/başlık flash'ı yok", async () => {
  const html = await render(SECTION, { ua: WEB_UA });
  assert.ok(!html.includes("Ödeme Geçmişi"), "yüklenmeden bölüm çizilmemeli");
});

// ── E2: iOS'ta pending satır DOM'da YOK ──

test("iOS + pending (E2): pending satır, referans kodu ve tutarı DOM'da YOK", async () => {
  const html = await render(SECTION, {
    ua: IOS_UA,
    props: { initialPayments: [PAY_PENDING, PAY_CONFIRMED, PAY_REJECTED] },
  });
  for (const forbidden of ["REF-PEND-77", "777", "Bekliyor"]) {
    assert.ok(!html.includes(forbidden), `iOS DOM'una pending izi sızdı: "${forbidden}"`);
  }
  // Sonuçlanmış geçmiş (makbuz erişimi) iOS'ta KALIR — satış yüzeyi değil.
  assert.ok(html.includes("Onaylı") && html.includes("Reddedildi"), "confirmed/rejected görünür");
  assert.ok(html.includes("4990 EUR"), "sonuçlanmış ödemenin tutarı makbuz olarak kalır");
});

test("iOS: yalnız pending varsa boş durum — talimat yüzeyi geri gelmez (E2)", async () => {
  const html = await render(SECTION, { ua: IOS_UA, props: { initialPayments: [PAY_PENDING] } });
  assert.ok(html.includes("Henüz bir ödeme kaydınız bulunmuyor"), "iOS'ta boş duruma düşer");
  assert.ok(!html.includes("REF-PEND-77") && !html.includes("777"), "pending izi olmamalı");
});

test("bölüm copy'sinde fiyat listesi / yükseltme çağrısı YOK (risk #4)", async () => {
  const html = await render(SECTION, {
    ua: WEB_UA,
    props: { initialPayments: [PAY_CONFIRMED], initialExpanded: PAY_CONFIRMED.name },
  });
  for (const forbidden of [
    "/ yıl",
    "/ ay",
    "paket seç",
    "yükselt",
    "Havale / EFT ile öde",
    "IBAN",
  ]) {
    assert.ok(!html.includes(forbidden), `bölüm copy'sine satış yüzeyi sızdı: "${forbidden}"`);
  }
});

// ── Gate mount: hem hasSubscription hem locked durumda ──

const ACTIVE_STATE = {
  access: "ok",
  status: "active",
  plan: "PRO",
  current_period_end: gunSonra(90),
  cancel_at_period_end: 0,
  billing_cycle: "yearly",
};

const LOCKED_STATE = { access: "locked", reason: "no_subscription" };

test("gate mount: abonelikli ve kilitli durumda bölüm bilgi kartının altında çizilir", async () => {
  for (const accessState of [ACTIVE_STATE, LOCKED_STATE]) {
    const html = await render(GATE, {
      ua: WEB_UA,
      accessState,
      props: { initialPayments: [PAY_CONFIRMED] },
    });
    assert.ok(html.includes("Ödeme Geçmişi"), "gate'te bölüm görünmeli");
    assert.ok(html.includes("4990 EUR"), "tohumlanan satır gate'te listelenmeli");
  }
});

test("gate mount (iOS + pending): gate üzerinden de pending izi sızmaz (E2)", async () => {
  const html = await render(GATE, {
    ua: IOS_UA,
    accessState: ACTIVE_STATE,
    props: { initialPayments: [PAY_PENDING, PAY_CONFIRMED] },
  });
  assert.ok(html.includes("Ödeme Geçmişi"), "bölüm iOS gate'inde görünür (makbuz ≠ satış yüzeyi)");
  for (const forbidden of ["REF-PEND-77", "777", "Bekliyor"]) {
    assert.ok(!html.includes(forbidden), `iOS gate DOM'una pending izi sızdı: "${forbidden}"`);
  }
});
