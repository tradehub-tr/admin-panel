import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

import vue from "@vitejs/plugin-vue";
import { JSDOM } from "jsdom";
import { createPinia } from "pinia";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createI18n } from "vue-i18n";

import { blocking, describe, scanHtml } from "../a11y/axeHarness.js";
import en from "../../../i18n/locales/en.js";
import tr from "../../../i18n/locales/tr.js";

/**
 * T-095 — `role="progressbar"` KENDİ adını taşıyor mu?
 *
 *   ÖLÇÜLDÜ  — `MediaUploadQueue` ve `MediaFilterRail` sunucu çıktısının
 *              `axe-core@4.13` taraması (0 kritik/ciddi bulgu) ve iki
 *              çubuğun `aria-labelledby` bağının GERÇEKTEN bir metne
 *              çözüldüğü (jsdom'da id araması).
 *   ÖLÇÜLMEDİ — gerçek ekran okuyucunun seslendirdiği cümle, tarayıcıdaki
 *              hidrasyon SONRASI DOM, renk kontrastı ve dokunma hedefi
 *              (`axeHarness.UNMEASURABLE_RULES`). Bu görevde tarayıcı
 *              doğrulaması YAPILMADI.
 *
 * ## Bu testin var oluş sebebi
 *
 * Faz 9 raporu §7.3 `MediaUploadQueue.vue:41-46`'yı erişilebilirlik için
 * "doğru örnek" diye listelemişti. Elle yazılmış assertion'lar `role` ve
 * `aria-valuenow` varlığını arıyordu; ikisi de vardı. Ne var ki
 * `progressbar` bir ADA da mecburdur (WCAG 4.1.2) ve `aria-valuenow` ad
 * yerine geçmez — kimse o soruyu sormadığı için iki `serious` ihlal
 * "doğru örnek" etiketiyle raporda durdu. Aradaki fark, "aradığımı buldum"
 * ile "ne olduğunu ölçtüm" arasındaki farktır; bu dosya ikincisini yapar.
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

/**
 * `MediaUploadQueue` geri sayım için `setup()` İÇİNDE `setInterval` kuruyor;
 * temizliği `onUnmounted`'a bağlı, o da SSR'da hiç çağrılmıyor. Sarmalanmazsa
 * her render bir zamanlayıcı sızdırır ve `node --test` süreci hiç kapanmaz.
 * (Tarayıcıda arıza değil — bileşen orada gerçekten unmount oluyor.)
 */
async function render(path, props, { copies = 1 } = {}) {
  const realSetInterval = globalThis.setInterval;
  const leaked = [];
  globalThis.setInterval = (...args) => {
    const handle = realSetInterval(...args);
    leaked.push(handle);
    return handle;
  };
  try {
    const { default: Component } = await server.ssrLoadModule(path);
    const app = createSSRApp({
      render: () =>
        copies === 1
          ? h(Component, props)
          : h(
              "div",
              Array.from({ length: copies }, (_, i) => h(Component, { ...props, key: i }))
            ),
    });
    app.use(
      createI18n({ legacy: false, locale: "tr", fallbackLocale: "tr", messages: { tr, en } })
    );
    app.use(createPinia());
    return await renderToString(app);
  } finally {
    globalThis.setInterval = realSetInterval;
    for (const handle of leaked) clearInterval(handle);
  }
}

const QUEUE = "/src/components/media/MediaUploadQueue.vue";
const RAIL = "/src/components/media/MediaFilterRail.vue";

const queueProps = {
  uploads: [
    { id: "u1", name: "vana-detay.png", progress: 40, status: "uploading", bytes: 2048 },
    { id: "u2", name: "kilit.jpg", progress: 5, status: "retrying", attempt: 2, bytes: 1024 },
  ],
};

const railProps = {
  groups: [{ id: "kind", label: "Tür", options: [{ id: "image", label: "Görsel", count: 4 }] }],
  tags: [{ tag: "vana", count: 3 }],
  usedBytes: 1024,
  quotaBytes: 4096,
};

const SURFACES = [
  ["MediaUploadQueue", QUEUE, queueProps],
  ["MediaFilterRail", RAIL, railProps],
];

test("ilerleme çubuğu taşıyan iki yüzeyde kritik/ciddi axe bulgusu YOK", async () => {
  for (const [label, path, props] of SURFACES) {
    const result = await scanHtml(await render(path, props));
    const found = blocking(result.violations);
    assert.equal(found.length, 0, `${label}:\n${describe(found)}`);
    // Taramanın boş belge üzerinde sessizce koşmadığının kanıtı.
    assert.ok(result.passes > 0, `${label}: hiçbir axe kuralı koşmadı`);
  }
});

/**
 * `axe` "ad var mı" der, "ad ANLAMLI mı" demez. Bağın ucundaki metni burada
 * ayrıca okuyoruz: `aria-labelledby` var ama gösterdiği id belgede yoksa
 * (yeniden adlandırma, `v-if` ile kaybolan düğüm) ad sessizce boşalır.
 */
function labelText(html, barSelector) {
  const { window } = new JSDOM(`<!doctype html><html lang="tr"><body>${html}</body></html>`);
  const bars = [...window.document.querySelectorAll(barSelector)];
  return bars.map((bar) => {
    const ids = (bar.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
    return ids.map((id) => window.document.getElementById(id)?.textContent?.trim() ?? null);
  });
}

test("kuyruktaki her çubuk kendi dosya adına bağlanıyor", async () => {
  const html = await render(QUEUE, queueProps);
  const names = labelText(html, '.upload-row__bar[role="progressbar"]');

  // İki satırdan yalnız 'uploading' olan çubuk çiziyor; 'retrying' satırı
  // yerine metin gösteriyor. Yani tek çubuk, tek ad.
  assert.equal(names.length, 1, "beklenen çubuk sayısı");
  assert.deepEqual(names[0], ["vana-detay.png"]);
});

test("depolama çubuğu ray başlığına bağlanıyor", async () => {
  const html = await render(RAIL, railProps);
  const names = labelText(html, '.mrail__storage-bar[role="progressbar"]');

  assert.equal(names.length, 1);
  assert.equal(names[0].length, 1, "aria-labelledby tek id'ye çözülmeli");
  assert.ok(names[0][0] && names[0][0].length > 0, `depolama başlığı boş: ${names[0][0]}`);
});

test("id'ler örneğe özel — ray AYNI belgede iki kez basılsa da çakışmıyor", async () => {
  // Masaüstü sütunu + mobil çekmece aynı belgede yan yana durabilir. Sabit bir
  // id iki kez basılsa `getElementById` ilk eşleşmeye takılır ve ikinci
  // çubuğun adı yanlış düğümden gelirdi.
  //
  // İki AYRI uygulama render etmek bunu ölçmez: `useId()` sayacı uygulama
  // başına sıfırlanır, iki bağımsız render doğal olarak aynı id'yi üretir ve
  // test sahte bir hata verirdi. Ölçülmesi gereken TEK belge içindeki
  // benzersizlik, o yüzden ikisi tek kökün altında.
  const html = await render(RAIL, railProps, { copies: 2 });
  const ids = [...html.matchAll(/class="mrail__storage-bar"[^>]*aria-labelledby="([^"]+)"/g)].map(
    (m) => m[1]
  );

  assert.equal(ids.length, 2, "iki ray da render edilmeli");
  assert.notEqual(ids[0], ids[1], "aynı belgede iki çubuk aynı id'ye bağlanamaz");

  // Ve her iki bağ da gerçekten KENDİ başlığına çözülmeli.
  const names = labelText(html, '.mrail__storage-bar[role="progressbar"]');
  assert.equal(names.length, 2);
  for (const [text] of names) assert.ok(text && text.length > 0, "boş ad");
});

test("kural gerçekten koşuyor — adsız progressbar YAKALANIYOR", async () => {
  // Olumlu kontrol: yukarıdaki 'bulgu YOK' sonuçları, kural kapalı olduğu
  // için de doğru görünebilirdi. Kasten adsız bir çubuk verilir.
  const result = await scanHtml('<div role="progressbar" aria-valuenow="5"></div>');
  assert.deepEqual(
    result.violations.map((v) => v.id),
    ["aria-progressbar-name"]
  );
  assert.equal(blocking(result.violations).length, 1);
});
