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
 * AD-1 / AC-11 + E4 — aylık/yıllık döngü seçici SSR render sözleşmesi.
 *
 *   ÖLÇÜLÜR  — seçili döngünün fiyat etiketi (monthly_price/yearly_price),
 *              tek döngülü planın diğer döngüye düşmesi, tek döngülü
 *              katalogda seçicinin HİÇ çizilmemesi, price_override_label'ın
 *              aynen korunması, iOS'ta seçici/fiyatın hiç basılmaması
 *              (mevcut isIosApp gating'i), bekleyen talep bloğunda
 *              döngü+tutar özeti ve E4 amount_updated bilgi notu.
 *   ÖLÇÜLMEZ — tıklama/istek parametresi (SSR'de olay koşmaz —
 *              iosSalesSurface deseni); seçim durumu initialCycle test
 *              tohumuyla verilir, onMounted SSR'de koşmadığı için plan
 *              listesi/bekleyen talep initialPlans/initialPending ile beslenir.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
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

async function render({ ua, accessState, props } = {}) {
  globalThis.window = { navigator: { userAgent: ua || WEB_UA } };
  try {
    const { default: Component } = await server.ssrLoadModule(GATE);
    const pinia = createPinia();
    setActivePinia(pinia);
    const sub = useSubscriptionStore(pinia);
    sub.state = accessState;
    sub.checked = true;
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
const gunSonra = (n) => `${new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)} 00:00:00`;

const LOCKED_STATE = { access: "locked", reason: "no_subscription" };

const ACTIVE_STATE = {
  access: "ok",
  status: "active",
  plan: "PRO",
  current_period_end: gunSonra(90),
  cancel_at_period_end: 0,
  billing_cycle: "yearly",
};

// Her iki döngüyü de sunan plan + yalnız yıllık plan + özel fiyat etiketi.
const PLAN_BOTH = {
  plan_code: "PRO",
  plan_name: "Pro Paket",
  monthly_price: 499,
  yearly_price: 4990,
  currency: "EUR",
  highlighted: 1,
  cta_action: "signup_billing",
  price_override_label: "",
  features: [],
};

const PLAN_YEARLY_ONLY = {
  plan_code: "START",
  plan_name: "Start Paket",
  monthly_price: 0,
  yearly_price: 1990,
  currency: "EUR",
  highlighted: 0,
  cta_action: "signup_billing",
  price_override_label: "",
  features: [],
};

const PLAN_OVERRIDE = {
  plan_code: "ENT",
  plan_name: "Kurumsal",
  monthly_price: 0,
  yearly_price: 0,
  currency: "EUR",
  highlighted: 0,
  cta_action: "contact_sales",
  price_override_label: "Size özel fiyat",
  features: [],
};

const PENDING_MONTHLY = {
  payment: "SP-0001",
  status: "pending",
  plan: "PRO",
  billing_cycle: "monthly",
  amount: 499,
  currency: "EUR",
  reference_code: "IST-REF-01",
  bank: { bank_name: "Test Bank", account_holder: "İstoç", iban: "TR000000", instructions: "" },
};

// ── Döngü seçimi → doğru fiyat etiketi ──

test("default (yearly): yıllık fiyat etiketi + seçici çizilir", async () => {
  const html = await render({
    ua: WEB_UA,
    accessState: LOCKED_STATE,
    props: { initialPlans: [PLAN_BOTH, PLAN_YEARLY_ONLY] },
  });
  assert.ok(html.includes("Fatura dönemi"), "döngü seçici radiogroup çizilmeli");
  assert.ok(html.includes("Aylık") && html.includes("Yıllık"), "iki döngü seçeneği görünmeli");
  assert.ok(html.includes("€4990 / yıl"), "default yearly fiyatı gösterilmeli");
  assert.ok(!html.includes("€499 / ay"), "yearly seçiliyken aylık fiyat basılmamalı");
});

test("monthly seçili: aylık fiyat etiketi; yalnız-yıllık plan yıllığa düşer (AC-11)", async () => {
  const html = await render({
    ua: WEB_UA,
    accessState: LOCKED_STATE,
    props: { initialPlans: [PLAN_BOTH, PLAN_YEARLY_ONLY], initialCycle: "monthly" },
  });
  assert.ok(html.includes("€499 / ay"), "monthly seçiliyken aylık fiyat gösterilmeli");
  assert.ok(!html.includes("€4990 / yıl"), "iki döngülü planın yıllık fiyatı basılmamalı");
  assert.ok(
    html.includes("€1990 / yıl"),
    "monthly_price<=0 olan plan monthly seçiliyken bile yalnız yıllık sunulur"
  );
});

test("price_override_label döngüden bağımsız aynen korunur", async () => {
  for (const cycle of ["yearly", "monthly"]) {
    const html = await render({
      ua: WEB_UA,
      accessState: LOCKED_STATE,
      props: { initialPlans: [PLAN_BOTH, PLAN_OVERRIDE], initialCycle: cycle },
    });
    assert.ok(html.includes("Size özel fiyat"), "override etiketi görünmeli");
    assert.ok(html.includes("Teklif Al"), "contact_sales CTA'sı değişmemeli");
  }
});

// ── Tek döngülü katalog → seçici YOK ──

test("monthly'siz katalog: döngü seçici hiç çizilmez", async () => {
  const html = await render({
    ua: WEB_UA,
    accessState: LOCKED_STATE,
    props: { initialPlans: [PLAN_YEARLY_ONLY, PLAN_OVERRIDE] },
  });
  assert.ok(!html.includes("Fatura dönemi"), "tek döngülü katalogda seçici olmamalı");
  assert.ok(html.includes("€1990 / yıl"), "yıllık fiyat aynen gösterilmeli");
});

// ── iOS: seçici + fiyat render edilmez (mevcut gating otomatik kapsar) ──

test("iOS: plan listesi dolu olsa da seçici ve fiyatlar HİÇ basılmaz", async () => {
  const html = await render({
    ua: IOS_UA,
    accessState: ACTIVE_STATE,
    props: { initialPlans: [PLAN_BOTH, PLAN_YEARLY_ONLY] },
  });
  for (const forbidden of ["Fatura dönemi", "/ yıl", "/ ay", "€4990", "€499", "Havale"]) {
    assert.ok(!html.includes(forbidden), `iOS çıktısına satış yüzeyi sızdı: "${forbidden}"`);
  }
});

test("iOS: bekleyen talep bloğu (döngü/tutar/IBAN) render edilmez", async () => {
  const html = await render({
    ua: IOS_UA,
    accessState: ACTIVE_STATE,
    props: { initialPending: { ...PENDING_MONTHLY, amount_updated: true } },
  });
  for (const forbidden of ["IBAN", "IST-REF-01", "güncel fiyata göre güncellendi", "499"]) {
    assert.ok(!html.includes(forbidden), `iOS çıktısına havale yüzeyi sızdı: "${forbidden}"`);
  }
});

// ── Bekleyen talep bloğu: döngü + tutar + E4 amount_updated notu ──

test("pending blok: seçilen döngü + tutar özeti gösterilir", async () => {
  const html = await render({
    ua: WEB_UA,
    accessState: LOCKED_STATE,
    props: { initialPending: PENDING_MONTHLY },
  });
  assert.ok(html.includes("Aylık"), "talebin döngüsü görünmeli");
  assert.ok(html.includes("499") && html.includes("EUR"), "talep tutarı görünmeli");
  assert.ok(html.includes("IST-REF-01"), "referans kodu görünmeli");
  assert.ok(
    !html.includes("güncel fiyata göre güncellendi"),
    "amount_updated yokken bilgi notu basılmamalı"
  );
});

test("pending blok (E4): amount_updated=true → tutar tazeleme bilgi notu", async () => {
  const html = await render({
    ua: WEB_UA,
    accessState: LOCKED_STATE,
    props: { initialPending: { ...PENDING_MONTHLY, amount_updated: true } },
  });
  assert.ok(
    html.includes("güncel fiyata göre güncellendi"),
    "E4 bilgi notu gösterilmeli"
  );
});
