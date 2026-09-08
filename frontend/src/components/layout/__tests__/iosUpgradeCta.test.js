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
import en from "../../../i18n/locales/en.js";
import ru from "../../../i18n/locales/ru.js";
import ar from "../../../i18n/locales/ar.js";

/**
 * AC-1 — iOS uygulamasında satın almaya çağrı YOK: CTA envanterinin 3 metin
 * riski (iosSalesSurface.test.js deseninin devamı).
 *
 *   1. SidePanel kilitli menü ipucu   (feed.upgradeBadge → feed.upgradeBadgeIos)
 *   2. MobileTabBar kilitli menü ipucu (aynı anahtar çifti)
 *   3. SellerFeedView upgrade gate     (feed.gateText → feed.gateTextIos)
 *
 *   ÖLÇÜLÜR  — SSR çıktısında kilit ipucunun/gate metninin iOS'ta nötr
 *              ("dahil değil"), web'de bugünkü ("yükseltin") olduğu; feature
 *              açıkken kilidin hiç çizilmediği; 4 locale'de iOS anahtarlarının
 *              var olduğu ve yükseltme/satın alma dili içermediği.
 *   ÖLÇÜLMEZ — MobileTabBar sheet İÇERİĞİ (sheet yalnız tıklamayla açılır,
 *              SSR'de olay koşmaz — errorStateRetry deseni). Bu yüzden orada
 *              SSR başlangıç durumu + kaynak-sözleşme denetimi birlikte koşar;
 *              anahtar seçme mekanizması SidePanel testiyle birebir aynı.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const SIDE_PANEL = "/src/components/layout/SidePanel.vue";
const MOBILE_TAB_BAR = "/src/components/layout/MobileTabBar.vue";
const FEED_VIEW = "/src/views/bulk-import/SellerFeedView.vue";

const FEED_FEATURE = "feature.import.xml_feed";
const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) istocApp/ios";
const WEB_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15";
const SELLER = { is_seller: 1, is_admin: 0, full_name: "Test Satıcı" };

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");

/**
 * useTheme.js (MobileTabBar zinciri) modül seviyesinde localStorage +
 * document.documentElement okur — SSR'de global stub şart. Navigation/tour
 * store'ların localStorage erişimleri try/catch'li ama stub onları da sadeleştirir.
 */
const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const noopClassList = { add: () => {}, remove: () => {} };
const savedGlobals = {};

function installGlobal(key, value) {
  if (!(key in savedGlobals)) {
    savedGlobals[key] = Object.prototype.hasOwnProperty.call(globalThis, key)
      ? globalThis[key]
      : undefined;
  }
  globalThis[key] = value;
}

let server;
let useEntitlement;
let useAuthStore;
let useNavigationStore;

before(async () => {
  installGlobal("localStorage", noopStorage);
  installGlobal("sessionStorage", noopStorage);
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: { alias: { "@": `${frontendRoot}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
  // dart-sass, require anında global `document`/`window` görürse kendini
  // tarayıcıda sanıp çöker. SCSS içeren ilk .vue derlemesini stub'lar
  // takılmadan ÖNCE yaptırıp sass'ı Node modunda cache'letiyoruz.
  await server.ssrLoadModule(FEED_VIEW);
  // useTheme.js (MobileTabBar zinciri) modül seviyesinde document.documentElement
  // okur — sass ısındıktan sonra stub güvenle takılır.
  installGlobal("document", {
    documentElement: { classList: noopClassList },
    addEventListener: () => {},
  });
  ({ useEntitlement } = await server.ssrLoadModule("/src/composables/useEntitlement.js"));
  ({ useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js"));
  ({ useNavigationStore } = await server.ssrLoadModule("/src/stores/navigation.js"));
});

after(async () => {
  await server?.close();
  for (const [key, value] of Object.entries(savedGlobals)) {
    if (value === undefined) delete globalThis[key];
    else globalThis[key] = value;
  }
});

const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
const originalWindow = globalThis.window;
afterEach(() => {
  if (hadWindow) globalThis.window = originalWindow;
  else delete globalThis.window;
});

function makeWindow({ ua = WEB_UA, capacitorIos = false } = {}) {
  return {
    navigator: { userAgent: ua },
    // useBreakpoint + sidebar store + useTheme ilk render'da matchMedia okur.
    matchMedia: () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    ...(capacitorIos ? { Capacitor: { getPlatform: () => "ios" } } : {}),
  };
}

/**
 * Bileşeni gerçek Pinia store'ları + gerçek modül-seviyesi entitlement
 * snapshot'ıyla basar (A9 ilkesi: sahtelenen yalnız BAŞLANGIÇ durumu).
 * `features` her testte açıkça seed edilir — snapshot modül-shared'dır.
 */
async function render(path, { ua, capacitorIos, features = {}, section } = {}) {
  globalThis.window = makeWindow({ ua, capacitorIos });
  try {
    useEntitlement().snapshot.value = { features, _cachedAt: Date.now() };
    const { default: Component } = await server.ssrLoadModule(path);
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore(pinia).user = SELLER;
    if (section) useNavigationStore(pinia).activeSection = section;
    const app = createSSRApp({ render: () => h(Component) });
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

// ── 1. SidePanel — kilitli menü ipucu ──

test("SidePanel (web): kilit ipucu bugünkü gibi 'Planınızı yükseltin'", async () => {
  const html = await render(SIDE_PANEL, { ua: WEB_UA, section: "products" });
  assert.ok(html.includes("panel-item-lock"), "feature kapalıyken kilit ikonu çizilmeli");
  assert.ok(html.includes("Planınızı yükseltin"), "web ipucu değişmemeli (regresyon yok)");
  assert.ok(!html.includes("Paketinize dahil değil"), "web'de iOS varyantı sızmamalı");
});

test("SidePanel (iOS): ipucu nötr — 'yükselt' HİÇ geçmez (AC-1)", async () => {
  const html = await render(SIDE_PANEL, { ua: IOS_UA, section: "products" });
  assert.ok(html.includes("panel-item-lock"), "kilit ikonu iOS'ta da çizilir (bilgi-only)");
  assert.ok(html.includes("Paketinize dahil değil"), "nötr ipucu basılmalı");
  assert.ok(!html.toLowerCase().includes("yükselt"), "iOS çıktısında yükseltme çağrısı sızdı");
});

test("SidePanel (Capacitor bridge iOS, UA işaretsiz): bayrak yine açık", async () => {
  const html = await render(SIDE_PANEL, { ua: WEB_UA, capacitorIos: true, section: "products" });
  assert.ok(html.includes("Paketinize dahil değil"), "bridge sinyali tek başına yeterli olmalı");
  assert.ok(!html.toLowerCase().includes("yükselt"));
});

test("SidePanel (feature açık): kilit ve ipucu iki platformda da yok", async () => {
  for (const ua of [WEB_UA, IOS_UA]) {
    const html = await render(SIDE_PANEL, {
      ua,
      section: "products",
      features: { [FEED_FEATURE]: true },
    });
    assert.ok(!html.includes("panel-item-lock"), "feature açıkken kilit çizilmemeli");
    assert.ok(!html.includes("Paketinize dahil değil"));
    assert.ok(!html.includes("Planınızı yükseltin"));
  }
});

// ── 2. MobileTabBar — kilitli menü ipucu ──

test("MobileTabBar (SSR başlangıç, web + iOS): çıktıda yükseltme çağrısı yok", async () => {
  for (const ua of [WEB_UA, IOS_UA]) {
    const html = await render(MOBILE_TAB_BAR, { ua });
    assert.ok(html.includes("m-tabbar"), "tab bar çizilmeli (render sağlığı)");
    // Sheet kapalı — kilit ipucu hiçbir varyantta basılmamalı.
    assert.ok(!html.toLowerCase().includes("yükselt"), `yükseltme metni sızdı (${ua})`);
  }
});

test("MobileTabBar kaynak sözleşmesi: kilit ipucu iOS-farkındalıklı anahtar kullanır", () => {
  // Sheet yalnız tıklamayla açıldığı için SSR ipucuna ulaşamaz (ÖLÇÜLMEZ notu).
  // Mekanizma SidePanel ile birebir aynı satırdır; burada sözleşmesi sabitlenir.
  const src = readFileSync(`${frontendRoot}/src/components/layout/MobileTabBar.vue`, "utf8");
  assert.ok(
    src.includes('isIosApp() ? "feed.upgradeBadgeIos" : "feed.upgradeBadge"'),
    "kilit ipucu anahtarı isIosApp() ile seçilmeli"
  );
  assert.ok(src.includes(':title="t(lockedHintKey)"'), "lock ikonu seçilen anahtarı kullanmalı");
  assert.ok(
    !src.includes("t('feed.upgradeBadge')"),
    "sabit feed.upgradeBadge çağrısı kalmamalı (iOS'ta yükseltme çağrısı sızar)"
  );
});

// ── 3. SellerFeedView — upgrade gate metni ──

test("gate (web): başlık + 'planınızı yükseltin' metni bugünkü gibi", async () => {
  const html = await render(FEED_VIEW, { ua: WEB_UA });
  assert.ok(html.includes("Bu özellik planınızda yok"), "gate başlığı çizilmeli");
  assert.ok(html.includes("planınızı yükseltin"), "web gate metni değişmemeli (regresyon yok)");
});

test("gate (iOS): nötr metin — yükseltmeye/satın almaya atıf HİÇ yok (AC-1)", async () => {
  const html = await render(FEED_VIEW, { ua: IOS_UA });
  assert.ok(html.includes("Bu özellik planınızda yok"), "bilgi-only başlık kalır");
  assert.ok(html.includes("paketinize dahil değil"), "nötr gate metni basılmalı");
  for (const forbidden of ["yükselt", "satın al", "havale", "iban", "paket seç"]) {
    assert.ok(
      !html.toLowerCase().includes(forbidden),
      `iOS gate çıktısında satış dili sızdı: "${forbidden}"`
    );
  }
});

test("gate (feature açık, iOS): gate yok, form çizilir, yükseltme metni yok", async () => {
  const html = await render(FEED_VIEW, { ua: IOS_UA, features: { [FEED_FEATURE]: true } });
  assert.ok(!html.includes("Bu özellik planınızda yok"), "feature açıkken gate çizilmemeli");
  assert.ok(html.includes('data-tour="sfv-form"'), "feed formu çizilmeli");
  assert.ok(!html.toLowerCase().includes("yükselt"));
});

// ── 4. i18n sözleşmesi — 4 locale'de iOS anahtarları nötr ──

test("i18n: 4 locale'de iOS anahtarları var ve yükseltme/satın alma dili içermiyor", () => {
  // Dil başına yasak kökler: yükseltme + satın alma çağrıları (AC-1).
  const forbidden = {
    tr: ["yükselt", "satın", "abone ol"],
    en: ["upgrade", "buy", "purchase", "subscribe"],
    ru: ["повы", "купи", "подпис", "оформ"],
    ar: ["ترقية", "رقِّ", "شراء", "اشتر"],
  };
  for (const [code, messages] of Object.entries({ tr, en, ru, ar })) {
    for (const key of ["upgradeBadgeIos", "gateTextIos"]) {
      const text = messages.feed?.[key];
      assert.ok(typeof text === "string" && text.length > 0, `${code}: feed.${key} eksik`);
      for (const word of forbidden[code]) {
        assert.ok(
          !text.toLowerCase().includes(word),
          `${code}: feed.${key} yasak dil içeriyor: "${word}"`
        );
      }
    }
  }
});
