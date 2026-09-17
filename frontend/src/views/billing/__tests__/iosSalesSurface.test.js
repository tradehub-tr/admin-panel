import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
 * AD-1/AD-2 — iOS bayrağı açık/kapalı render sözleşmesi (AC-1/AC-2/AC-3,
 * R3 trial iptali, AC-10 iptal akışı).
 *
 *   ÖLÇÜLÜR  — SSR çıktısında satış yüzeylerinin (paket/fiyat/trial CTA/
 *              havale-IBAN/"paket seç") iOS'ta HİÇ basılmadığı, web'de
 *              bugünkü gibi basıldığı; bilgi-only alanların (plan, durum,
 *              dönem bitişi) iOS'ta kaldığı; iptal butonunun yalnız aktif
 *              abonelikte çizildiği (trial'da R3 metni), iptal-planlı
 *              durumda banner + "İptali Geri Al"ın çizildiği; iptal
 *              modalının zorunlu anket iskeleti.
 *   ÖLÇÜLMEZ — tıklama/adım geçişi (SSR'de olay koşmaz — errorStateRetry
 *              deseni), gerçek Capacitor webview UA'sı (gerçek cihaz/
 *              TestFlight doğrulaması DoD'de ayrı), backend uçları
 *              (onMounted SSR'de koşmaz, ağ çağrısı yok).
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const GATE = "/src/views/billing/SubscriptionGateView.vue";
const BANNER = "/src/components/SellerTrialBanner.vue";
const MODAL = "/src/components/billing/CancelSubscriptionModal.vue";

const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) istocApp/ios";
const WEB_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15";

/**
 * SSR çıktısındaki HTML yorumları (template açıklamaları + v-if yer
 * tutucuları) ölçümden çıkarılır: kullanıcının GÖRDÜĞÜ yüzey ölçülür,
 * geliştirici yorumu değil. Prod build'de yorumlar zaten basılmaz.
 */
const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");

let server;
let useSubscriptionStore;
let useAuthStore;

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
  ({ useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js"));
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

/**
 * Bileşeni gerçek Pinia store'larıyla (sahtelenmez — A9 ilkesi: sahtelenen
 * yalnız BAŞLANGIÇ durumu) verilen UA altında sunucuda basar.
 * Teleport içerikleri (modal) `teleports.body`'den okunur.
 */
async function render(path, { ua, accessState, user, props } = {}) {
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
    if (user !== undefined) {
      const auth = useAuthStore(pinia);
      auth.user = user;
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
    const ctx = {};
    const html = stripComments(await renderToString(app, ctx));
    const teleports = Object.fromEntries(
      Object.entries(ctx.teleports || {}).map(([k, v]) => [k, stripComments(v)])
    );
    return { html, teleports };
  } finally {
    if (hadWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
  }
}

// Zaman-bombası denetimi gereği gelecek tarih SABİT yazılamaz; koşuma göre
// ileri tarihler hesaplanır (assertion'lar tarih metnine bağlı değil).
const gunSonra = (n) => `${new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)} 00:00:00`;

const ACTIVE_STATE = {
  access: "ok",
  status: "active",
  plan: "PRO",
  started_at: "2025-10-01 00:00:00",
  current_period_end: gunSonra(90),
  cancel_at_period_end: 0,
  billing_cycle: "yearly",
};

const TRIAL_STATE = {
  access: "ok",
  status: "trial",
  is_trial: 1,
  plan: "PRO",
  trial_end: gunSonra(3650),
};

// ── SubscriptionGateView — aktif abonelik ──

test("gate (web, aktif): satış yüzeyi bugünkü gibi + iptal butonu ilk ekranda (AC-3/AC-10)", async () => {
  const { html } = await render(GATE, { ua: WEB_UA, accessState: ACTIVE_STATE });
  assert.ok(html.includes("Aktif Aboneliğiniz"));
  assert.ok(html.includes("Paketler yükleniyor"), "web'de paket bölümü çizilir (regresyon yok)");
  assert.ok(html.includes("değiştirmek / yükseltmek"), "web yükseltme yönlendirmesi kalır");
  assert.ok(html.includes("Aboneliği İptal Et"), "iptal butonu ilk ekranda erişilebilir");
});

test("gate (iOS, aktif): bilgi-only — fiyat/CTA/havale yok, plan+dönem+iptal var (AC-1/AC-2)", async () => {
  const { html } = await render(GATE, { ua: IOS_UA, accessState: ACTIVE_STATE });
  // Bilgi-only alanlar KALIR:
  assert.ok(html.includes("Aktif Aboneliğiniz"));
  assert.ok(html.includes("PRO"));
  assert.ok(html.includes("Yenileme tarihi"), "dönem bitişi görünür");
  assert.ok(html.includes("Aboneliği İptal Et"), "iptal akışı iOS'ta da aynen çalışır");
  // Satış yüzeyleri HİÇ basılmaz:
  for (const forbidden of [
    "Paketler yükleniyor",
    "değiştirmek / yükseltmek",
    "paket seç",
    "ücretsiz dene",
    "Havale",
    "IBAN",
  ]) {
    assert.ok(!html.includes(forbidden), `iOS çıktısında satış yüzeyi sızdı: "${forbidden}"`);
  }
});

test("gate (Capacitor bridge iOS, UA işaretsiz): bayrak yine açık", async () => {
  globalThis.window = {
    Capacitor: { getPlatform: () => "ios" },
    navigator: { userAgent: WEB_UA },
  };
  const { default: Component } = await server.ssrLoadModule(GATE);
  const pinia = createPinia();
  setActivePinia(pinia);
  const sub = useSubscriptionStore(pinia);
  sub.state = ACTIVE_STATE;
  sub.checked = true;
  const app = createSSRApp({ render: () => h(Component) });
  app.use(pinia);
  app.use(createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr } }));
  app.use(
    createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/:pathMatch(.*)*", component: { render: () => null } }],
    })
  );
  const html = stripComments(await renderToString(app, {}));
  assert.ok(!html.includes("Paketler yükleniyor"), "bridge sinyali tek başına yeterli olmalı");
});

// ── R3 — trial'da iptal butonu GİZLİ, otomatik sona erme metni var ──

test("gate (trial, web + iOS): iptal butonu yok, 'otomatik sona erer, ücret alınmaz' var (R3)", async () => {
  for (const ua of [WEB_UA, IOS_UA]) {
    const { html } = await render(GATE, { ua, accessState: TRIAL_STATE });
    assert.ok(!html.includes("Aboneliği İptal Et"), "trial'da iptal butonu çizilmemeli");
    assert.ok(
      html.includes("otomatik sona erer, ücret alınmaz"),
      "trial'da otomatik bitiş metni gösterilmeli"
    );
  }
});

// ── İptal planlı: banner + tek tık geri alma ──

test("gate (iptal planlı): banner + 'İptali Geri Al', yeni iptal butonu yok (AC-10)", async () => {
  const state = { ...ACTIVE_STATE, cancel_at_period_end: 1 };
  for (const ua of [WEB_UA, IOS_UA]) {
    const { html } = await render(GATE, { ua, accessState: state });
    assert.ok(html.includes("İptal planlandı"), "iptal-planlı banner görünmeli");
    assert.ok(html.includes("İptali Geri Al"), "tek tık geri alma görünmeli");
    assert.ok(html.includes("Erişim bitişi"), "yenileme değil bitiş tarihi etiketi");
    assert.ok(!html.includes("Aboneliği İptal Et"), "ikinci bir iptal butonu çizilmemeli");
  }
});

// ── Kilitli (canceled) — iOS nötr metin, web bugünkü yönlendirme ──

test("gate (locked/canceled): web 'paket seçin' der, iOS satın almaya YÖNLENDİRMEZ", async () => {
  const locked = { access: "locked", reason: "canceled", canceled_at: "2026-09-01 12:00:00" };
  const web = await render(GATE, { ua: WEB_UA, accessState: locked });
  assert.ok(web.html.includes("Panele dönmek için bir paket seçin"));

  const ios = await render(GATE, { ua: IOS_UA, accessState: locked });
  assert.ok(ios.html.includes("Aboneliğiniz sona erdi"), "nötr bilgi metni");
  assert.ok(ios.html.includes("İptal tarihi"), "canceled_at gösterilir (AC-2)");
  assert.ok(!ios.html.includes("paket seç"), "iOS kilit metni satın almaya yönlendiremez");
});

// ── Dunning (Faz C dilim 1) — past_due etiketi, suspended copy, dunning feshi ──

const PAST_DUE_STATE = {
  access: "ok",
  status: "past_due",
  plan: "PRO",
  current_period_end: "2026-09-01 00:00:00",
  billing_cycle: "yearly",
  cancel_at_period_end: 0,
  is_trial: false,
  in_dunning: 1,
  dunning_grace_end: gunSonra(10),
};

test("gate (past_due, web + iOS): 'Ödeme bekleniyor' etiketi, kilit yok, iptal butonu yok (D3)", async () => {
  for (const ua of [WEB_UA, IOS_UA]) {
    const { html } = await render(GATE, { ua, accessState: PAST_DUE_STATE });
    assert.ok(html.includes("Aktif Aboneliğiniz"), "hoşgörü penceresi paywall'a düşürmez (AC-1)");
    assert.ok(html.includes("Ödeme bekleniyor"), "dunning'deki mağaza 'Aktif' etiketi GÖRMEZ");
    assert.ok(!html.includes(">Aktif<"), "past_due'da 'Aktif' rozeti basılmaz");
    assert.ok(!html.includes("Aboneliği İptal Et"), "canCancel yalnız status==='active' (değişmedi)");
  }
});

test("gate (past_due, iOS): etiket nötr kalır, satış yüzeyi yine sızmaz", async () => {
  const { html } = await render(GATE, { ua: IOS_UA, accessState: PAST_DUE_STATE });
  assert.ok(html.includes("Ödeme bekleniyor"), "D3 etiketi iOS'ta da aynen görünür");
  for (const forbidden of ["Paketler yükleniyor", "paket seç", "ücretsiz dene", "Havale", "IBAN"]) {
    assert.ok(!html.includes(forbidden), `iOS çıktısında satış yüzeyi sızdı: "${forbidden}"`);
  }
});

test("gate (locked/suspended): web fesih tarihli geri dönüş copy'si, no_subscription'a DÜŞMEZ", async () => {
  const expireAt = gunSonra(16);
  const suspended = {
    access: "locked",
    reason: "suspended",
    suspended_at: "2026-09-10 03:00:00",
    dunning_expire_at: expireAt,
  };
  const { html } = await render(GATE, { ua: WEB_UA, accessState: suspended });
  assert.ok(html.includes("Mağazanız askıya alındı"), "yeni 'suspended' anahtarı kullanılır");
  assert.ok(html.includes("Vitrininiz geçici pasif"));
  assert.ok(html.includes("fesih olmadan geri dönebilirsiniz"));
  const tarih = new Date(expireAt.replace(" ", "T")).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  assert.ok(html.includes(tarih), "dunning_expire_at okunur biçimde basılır");
  assert.ok(!html.includes("Devam etmek için bir paket seçin"), "no_subscription fallback'i değil");
});

test("gate (locked/suspended, iOS): nötr metin — ödeme çağrısı ve satın-alma yönlendirmesi YOK", async () => {
  const suspended = {
    access: "locked",
    reason: "suspended",
    suspended_at: "2026-09-10 03:00:00",
    dunning_expire_at: gunSonra(16),
  };
  const { html } = await render(GATE, { ua: IOS_UA, accessState: suspended });
  assert.ok(html.includes("Mağazanız askıya alındı"), "nötr bilgi başlığı");
  assert.ok(html.includes("korunuyor"), "veri güvencesi metni");
  for (const forbidden of ["Ödemenizi tamamlayın", "paket seç", "Havale", "IBAN"]) {
    assert.ok(!html.includes(forbidden), `iOS suspended copy'sinde yasak ifade: "${forbidden}"`);
  }
});

test("gate (locked/trial_expired + expired_cause='dunning'): fesih varyantı; cause'suz eski copy (AC-8)", async () => {
  const dunningExpired = { access: "locked", reason: "trial_expired", expired_cause: "dunning" };
  const web = await render(GATE, { ua: WEB_UA, accessState: dunningExpired });
  assert.ok(web.html.includes("ödeme alınamadığı için sona erdi"), "dunning feshi varyantı");
  assert.ok(web.html.includes("verileriniz korunuyor"));
  assert.ok(!web.html.includes("Deneme süreniz doldu"), "trial copy'si basılmaz");

  const ios = await render(GATE, { ua: IOS_UA, accessState: dunningExpired });
  assert.ok(ios.html.includes("ödeme alınamadığı için sona erdi"), "iOS nötr fesih varyantı");
  assert.ok(!ios.html.includes("paket seç"), "iOS fesih copy'si satın almaya yönlendiremez");

  // Regresyon: expired_cause yok/trial → bugünkü trial_expired copy'si kalır.
  const legacy = { access: "locked", reason: "trial_expired" };
  const { html } = await render(GATE, { ua: WEB_UA, accessState: legacy });
  assert.ok(html.includes("Deneme süreniz doldu"), "cause'suz expired eski copy'yi korur");
});

// ── SellerTrialBanner — CTA linki iOS'ta gizli, kalan gün kalır ──

const SELLER = { is_seller: 1, is_admin: 0, full_name: "Test Satıcı" };

test("banner (web): /abonelik linki + kalan gün (AC-3)", async () => {
  const { html } = await render(BANNER, { ua: WEB_UA, accessState: TRIAL_STATE, user: SELLER });
  assert.ok(html.includes('href="/abonelik"'), "web'de banner pakete götüren linktir");
  assert.ok(html.includes("kaldı"), "kalan gün metni");
});

test("banner (iOS): link/CTA yok, kalan gün bilgisi KALIR (AC-1)", async () => {
  const { html } = await render(BANNER, { ua: IOS_UA, accessState: TRIAL_STATE, user: SELLER });
  assert.ok(!html.includes("href"), "iOS'ta /abonelik linki basılmamalı");
  assert.ok(!html.includes("<a"), "iOS'ta anchor çizilmemeli");
  assert.ok(html.includes("kaldı"), "kalan gün bilgisi iOS'ta da görünür");
  assert.ok(html.includes("trial-banner--static"), "bilgi-only kip işareti");
});

// ── M4 — rehberli tur iOS'ta kaydedilmez (anti-steering) ──
// usePageTour kaydı onMounted'da yapılır; SSR'de onMounted koşmadığı için
// davranış burada ÖLÇÜLMEZ (errorStateRetry deseni) — kaynak sözleşmesi
// sabitlenir, filtre davranışı stores/__tests__/tourPageStepsDomFilter.test.js.

test("M4: tur adımları iosApp bayrağıyla boşaltılır — iOS'ta tur HİÇ kaydedilmez", () => {
  const src = readFileSync(`${frontendRoot}/src/views/billing/SubscriptionGateView.vue`, "utf8");
  assert.ok(
    /usePageTour\(\s*"subscription-gate",\s*\(\)\s*=>\s*iosApp\s*\?\s*\[\]\s*:/.test(src),
    "usePageTour adım üreticisi 'iosApp ? [] : [...]' guard'ı taşımalı — " +
      "adım metinleri fiyat/abonelik/havale anlatır, hedefleri iOS'ta çizilmez"
  );
  // Regresyon: guard'sız düz liste dönüşü geri gelmesin.
  assert.ok(
    !/usePageTour\(\s*"subscription-gate",\s*\(\)\s*=>\s*\[/.test(src),
    "koşulsuz adım listesi iOS'ta ekran-ortası popover'la satış metni sızdırır"
  );
});

// ── CancelSubscriptionModal — zorunlu anket iskeleti ──

test("iptal modalı: 6 sebep, opsiyonel not (max 500), sebepsiz Devam kilitli (AC-10)", async () => {
  const { teleports } = await render(MODAL, {
    ua: WEB_UA,
    accessState: ACTIVE_STATE,
    props: { open: true, periodEndLabel: "1 Ekim 2026" },
  });
  const html = teleports.body || "";
  for (const label of [
    "Fiyat bana uygun değil",
    "Paneli kullanmıyorum",
    "İhtiyacım olan özellik eksik",
    "İşlerim geçici olarak durgun",
    "Mağazamı kapatıyorum",
    "Diğer",
  ]) {
    assert.ok(html.includes(label), `sebep seçeneği eksik: ${label}`);
  }
  assert.ok(html.includes('maxlength="500"'), "not alanı 500 karakterle sınırlı");
  assert.ok(html.includes("Vazgeç"), "vazgeç her adımda tek tık (karanlık desen yok)");
  // Sebep seçilmeden Devam kilitli — SSR başlangıç durumunda disabled basılır.
  const devamBtn = html.match(/<button[^>]*>\s*Devam\s*<\/button>/);
  assert.ok(devamBtn, "Devam butonu bulunamadı");
  assert.ok(devamBtn[0].includes("disabled"), "sebep seçilmeden devam EDİLEMEZ");
});
