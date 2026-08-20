import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createI18n } from "vue-i18n";

/**
 * `MediaCard uniform` — pencerelenmiş ızgarada SABİT satır yüksekliği (T-092).
 *
 *   ÖLÇÜLDÜ  — kartın yapısı: alt metin uyarısı satırı `uniform` açıkken her
 *              kartta VAR, uyarı gerekmeyen kartta yer tutucu olarak duruyor ve
 *              erişilebilirlik ağacında görünmüyor. Yani sunucu çıktısında her
 *              kart aynı sayıda meta satırı taşıyor.
 *   ÖLÇÜLMEDİ — PİKSEL yüksekliği. Burada düzen motoru yok; "her kart tam
 *              olarak N px" DENMİYOR. Eşitliğin ikinci yarısı CSS'te
 *              (`.mcard--uniform .mcard__meta` sütun akışı) ve ancak gerçek
 *              tarayıcıda doğrulanabilir — bu görevde tarayıcı doğrulaması
 *              yapılmadı.
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

const BASE = {
  id: "M-1",
  fileName: "vana.webp",
  title: "",
  kind: "image",
  alt: "Küresel vana",
  ext: "WEBP",
  bytes: 120_000,
  width: 1920,
  height: 1080,
  uploadedAt: "2026-01-01",
  tags: [],
  liveUsage: 0,
};

async function renderCard(item, props = {}) {
  const { default: MediaCard } = await server.ssrLoadModule("/src/components/media/MediaCard.vue");
  const app = createSSRApp({ render: () => h(MediaCard, { item, ...props }) });
  app.use(
    createI18n({
      legacy: false,
      locale: "tr",
      messages: { tr: {} },
      missingWarn: false,
      fallbackWarn: false,
    })
  );
  return renderToString(app);
}

const warnRows = (html) => (html.match(/class="[^"]*mcard__alt-warn/g) || []).length;

test("uniform KAPALIYKEN uyarı satırı yalnız gerektiğinde basılır", async () => {
  // Bugünkü davranış korunuyor: sıradan ızgarada boş yer ayırmanın anlamı yok.
  assert.equal(warnRows(await renderCard({ ...BASE, alt: "Küresel vana" })), 0);
  assert.equal(warnRows(await renderCard({ ...BASE, alt: "" })), 1);
});

test("uniform AÇIKKEN uyarı satırı her kartta ayrılır — yükseklik içerikten bağımsız", async () => {
  // Pencerelemenin matematiği sabit satır yüksekliğine dayanıyor. Uyarı bazı
  // kartlarda çıkıp bazılarında çıkmasaydı satırlar farklı boyda olur,
  // basılmayan satırların yerine konan boşluk gerçeğinden sapardı.
  const withAlt = await renderCard({ ...BASE, alt: "Küresel vana" }, { uniform: true });
  const withoutAlt = await renderCard({ ...BASE, alt: "" }, { uniform: true });

  assert.equal(warnRows(withAlt), 1);
  assert.equal(warnRows(withoutAlt), 1);
  assert.match(withAlt, /mcard--uniform/);
});

test("yer tutucu ekran okuyucuya sızmaz", async () => {
  const html = await renderCard({ ...BASE, alt: "Küresel vana" }, { uniform: true });
  // Alt metni OLAN bir görsel için "alt metin eksik" duyurmak yalan olurdu.
  assert.match(html, /mcard__alt-warn--ghost/);
  assert.match(
    html,
    /aria-hidden="true"[^>]*class="[^"]*mcard__alt-warn--ghost|mcard__alt-warn--ghost[^>]*aria-hidden="true"/
  );
});

test("uyarı gerçekten gerekiyorsa yer tutucu DEĞİL, uyarının kendisi basılır", async () => {
  const html = await renderCard({ ...BASE, alt: "" }, { uniform: true });
  assert.doesNotMatch(html, /mcard__alt-warn--ghost/);
  assert.match(html, /media\.card\.missingAlt/);
});
