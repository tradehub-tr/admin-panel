import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, afterEach, before, test } from "node:test";

import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";
import { createSSRApp, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { renderToString } from "@vue/server-renderer";

/**
 * AD-3 — DunningBanner render sözleşmesi (AC-10, Node SSR — iosSalesSurface
 * deseni).
 *
 *   ÖLÇÜLÜR  — banner'ın yalnız in_dunning=1 (past_due hoşgörü penceresi)
 *              satıcısında çizildiği; active/trial'da HİÇ basılmadığı;
 *              web'de /abonelik CTA'sı, iOS'ta CTA yerine nötr bilgi
 *              kutusu (anti-steering); hoşgörü bitiş tarihinin basıldığı.
 *   ÖLÇÜLMEZ — tıklama/navigasyon (SSR'de olay koşmaz), gerçek backend
 *              (store başlangıç durumu sahtelenir — A9 ilkesi), AppLayout
 *              mount zinciri (layout'un kendi sorumluluğu).
 */

const frontendRoot = fileURLToPath(new URL("../../..", import.meta.url));
const BANNER = "/src/components/DunningBanner.vue";

const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) istocApp/ios";
const WEB_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15";

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");

// Zaman-bombası denetimi gereği gelecek tarih SABİT yazılamaz; koşuma göre
// ileri tarihler hesaplanır (assertion tarih metnini aynı formülle üretir).
const gunSonra = (n) => `${new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)} 00:00:00`;

const SELLER = { is_seller: 1, is_admin: 0, full_name: "Test Satıcı" };

const PAST_DUE_STATE = {
  access: "ok",
  status: "past_due",
  plan: "PRO",
  current_period_end: "2026-09-01 00:00:00",
  in_dunning: 1,
  dunning_grace_end: gunSonra(10),
};

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

/** Gerçek Pinia store'larıyla (sahtelenen yalnız BAŞLANGIÇ durumu) SSR basar. */
async function render({ ua, accessState, user } = {}) {
  globalThis.window = { navigator: { userAgent: ua || WEB_UA } };
  try {
    const { default: Component } = await server.ssrLoadModule(BANNER);
    const pinia = createPinia();
    setActivePinia(pinia);
    if (accessState !== undefined) {
      const sub = useSubscriptionStore(pinia);
      sub.state = accessState;
      sub.checked = true;
    }
    const auth = useAuthStore(pinia);
    auth.user = user ?? SELLER;
    const app = createSSRApp({ render: () => h(Component) });
    app.use(pinia);
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

test("banner (web, past_due): görünür — hoşgörü bitişi + /abonelik CTA (AC-10)", async () => {
  const html = await render({ ua: WEB_UA, accessState: PAST_DUE_STATE });
  assert.ok(html.includes("ödemenizi bekliyoruz"), "dunning metni basılır");
  assert.ok(html.includes('href="/abonelik"'), "web'de banner ödeme sayfasına götüren linktir");
  const tarih = new Date(PAST_DUE_STATE.dunning_grace_end.replace(" ", "T")).toLocaleDateString(
    "tr-TR",
    { day: "2-digit", month: "long", year: "numeric" }
  );
  assert.ok(html.includes(tarih), "hoşgörü bitiş tarihi okunur biçimde basılır");
  assert.ok(html.includes("tarihine kadar sürer"), "erişim süresi metni");
});

test("banner (active + trial): HİÇ basılmaz", async () => {
  const states = [
    {
      access: "ok",
      status: "active",
      plan: "PRO",
      current_period_end: gunSonra(90),
    },
    { access: "ok", status: "trial", is_trial: 1, plan: "PRO", trial_end: gunSonra(10) },
  ];
  for (const accessState of states) {
    const html = await render({ ua: WEB_UA, accessState });
    assert.ok(
      !html.includes("ödemenizi bekliyoruz"),
      `in_dunning yokken banner çizilmemeli (status=${accessState.status})`
    );
    assert.ok(!html.includes("dunning-banner"), "kök eleman dahi basılmaz (v-if)");
  }
});

test("banner (iOS, past_due): CTA yerine nötr bilgi kutusu — link/ok yok, tarih kalır", async () => {
  const html = await render({ ua: IOS_UA, accessState: PAST_DUE_STATE });
  assert.ok(!html.includes("href"), "iOS'ta /abonelik linki basılmamalı (anti-steering)");
  assert.ok(!html.includes("<a"), "iOS'ta anchor çizilmemeli");
  assert.ok(html.includes("ödemenizi bekliyoruz"), "bilgi metni iOS'ta da görünür");
  assert.ok(html.includes("tarihine kadar sürer"), "hoşgörü bitişi bilgisi kalır");
  assert.ok(html.includes("dunning-banner--static"), "bilgi-only kip işareti");
});

test("banner (admin): satıcı olmayan kullanıcıda basılmaz", async () => {
  const html = await render({
    ua: WEB_UA,
    accessState: PAST_DUE_STATE,
    user: { is_seller: 0, is_admin: 1, full_name: "Test Admin" },
  });
  assert.ok(!html.includes("dunning-banner"), "banner yalnız satıcı hesabında çizilir");
});
