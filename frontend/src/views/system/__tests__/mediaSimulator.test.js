import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import vue from "@vitejs/plugin-vue";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { createI18n } from "vue-i18n";
import { renderToString } from "@vue/server-renderer";

import ar from "../../../i18n/locales/ar.js";
import en from "../../../i18n/locales/en.js";
import ru from "../../../i18n/locales/ru.js";
import tr from "../../../i18n/locales/tr.js";

/**
 * Önizleme simülatörü ekranının duman testi — ekran GERÇEKTEN çiziliyor mu.
 *
 *   ÖLÇÜLÜR  — dört dilde sunucu tarafı render, 65 kombinasyonun tablosunun
 *              gerçekten basılması, ölçülmemiş veri uyarısının ve
 *              ölçülemeyen bölge listesinin ekranda olması.
 *   ÖLÇÜLMEZ — tarayıcıdaki etkileşim (tıklama, ok tuşları). SSR tek geçişte
 *              çizer; olay işleyicileri bu testte KOŞMAZ.
 *
 * `@/utils/api` sahtesi kullanılıyor: ekran açılışta gerçek `Media Rendition`
 * satırını soruyor ve o sorgu backend'siz ortamda atılamaz.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));

let server;
let calls;

before(async () => {
  server = await createServer({
    configFile: false,
    root: frontendRoot,
    logLevel: "silent",
    plugins: [vue()],
    resolve: {
      alias: [
        {
          find: /^@\/utils\/api$/,
          replacement: `${frontendRoot}/src/components/media/__tests__/fixtures/apiMock.js`,
        },
        { find: "@", replacement: `${frontendRoot}/src` },
      ],
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  calls = [];
  // Tablo boş: bugünkü gerçek durum. Ekran bunu arıza saymamalı.
  globalThis.__mediaApiMock = async (doctype, params) => {
    calls.push({ doctype, params });
    return { data: [] };
  };
});

after(async () => {
  await server?.close();
  delete globalThis.__mediaApiMock;
});

const messages = { tr, en, ar, ru };

async function renderView(locale = "tr") {
  const { default: View } = await server.ssrLoadModule("/src/views/system/MediaSimulatorView.vue");
  const app = createSSRApp({ render: () => h(View) });
  app.use(createI18n({ legacy: false, locale, fallbackLocale: "tr", messages }));
  return renderToString(app);
}

test("ekran dört dilde de çiziliyor ve çeviri anahtarı sızmıyor", async () => {
  for (const locale of Object.keys(messages)) {
    const html = await renderView(locale);
    assert.ok(html.length > 2000, `${locale}: ekran boş çizildi`);
    assert.doesNotMatch(html, /mediaSimulator\.[a-z]/i, `${locale}: çözülmemiş çeviri anahtarı`);
    assert.match(html, new RegExp(messages[locale].mediaSimulator.title));
  }
});

test("65 kombinasyonun tamamı tabloda basılıyor", async () => {
  const html = await renderView();
  // Her satırın bir `scope="row"` başlığı var; ayrıca poster tablosunun 13
  // satırı da aynı işareti taşıyor. T-071 karar kartı (`section.simvd`) kendi
  // tablolarını basıyor ve o satırlar BU sayıma girmez — sayım matrisin
  // eksiksizliğini ölçüyor, ekrandaki toplam satır sayısını değil.
  const matris = html.replace(/<section class="simvd"[\s\S]*?<\/section>/, "");
  assert.ok(matris.length < html.length, "karar kartı ekranda yok — mount kaybolmuş");
  const rows = (matris.match(/scope="row"/g) || []).length;
  assert.equal(rows, 65 + 13, `beklenen 78 satır başlığı, bulunan ${rows}`);
});

test("13 cihaz ve 15 yerleşim seçeneği listeleniyor", async () => {
  const html = await renderView();
  assert.equal((html.match(/role="radio"/g) || []).length, 13 + 15);
  assert.equal((html.match(/role="radiogroup"/g) || []).length, 2);
});

test("ölçüm durumu ve ölçülemeyen bölgeler gizlenmiyor", async () => {
  const html = await renderView();
  assert.match(html, /EMULE_DEGERLER_OLCULMEDI/, "cihaz ölçüm durumu ekranda değil");
  // T-115 (2026-08-20): 15 bölgenin 8'i gerçek tarayıcıda doğrulandı, katalog
  // durumu KISMEN_DOGRULANDI oldu. Eski iddia ("hiç doğrulanmadı") artık YANLIŞ
  // olurdu; yeni kural Python ikiziyle aynı (test_simulator_srcset.py): katalog
  // ne tam doğrulanmış numarası yapabilir ne doğrulanmamış bölgeleri saklayabilir.
  assert.match(html, /KISMEN_DOGRULANDI/, "kısmi doğrulama durumu ekranda değil");
  assert.match(html, /tailored_grid/, "doğrulanmamış bölge adı ekranda geçmiyor");
  // `placements.json` üç bölgeyi OLCULMEDI diye dışarıda bırakmış.
  assert.match(html, /recommendation_slider/, "ölçülemeyen bölge gizlenmiş");
  assert.match(html, /category_bento/);
  assert.match(html, /template_tiles/);
});

test("boş Media Rendition tablosu arıza değil, beklenen durum", async () => {
  // SSR `onMounted`'ı KOŞTURMAZ; sorgu istemci tarafında atılıyor. Bu yüzden
  // sorgunun şekli composable'ın kendisinden ölçülüyor, ekranın HTML'inden
  // değil — aksi hâlde test hiçbir şey doğrulamadan yeşil olurdu.
  const { useSrcsetSimulator, PROBE_EMPTY } = await server.ssrLoadModule(
    "/src/composables/useSrcsetSimulator.js"
  );
  const sim = useSrcsetSimulator();
  calls.length = 0;
  await sim.probe();

  assert.equal(calls.length, 1, "gerçek satır hiç sorulmamış");
  assert.equal(calls[0].doctype, "Media Rendition");
  assert.deepEqual(calls[0].params.filters, [["profile", "=", sim.selection.value.chosen.name]]);
  // Satıcı izolasyonu sunucuda (`media_rendition_query_conditions`) uygulanır;
  // istemci ayrıca süzerse izolasyon istemciye taşınmış olur.
  assert.equal(calls[0].params.filters.length, 1, "istemcide ikinci bir süzgeç olmamalı");
  assert.equal(sim.probeState.value, PROBE_EMPTY, "boş yanıt 'arıza' değil 'henüz yok'");
  assert.equal(sim.probeRow.value, null);
});

test("ölçülen üç sayı ekrandaki özet satırında", async () => {
  const html = await renderView();
  // 65 kombinasyon: kaynak_yetersiz 0, aşırı servis 3, zoom yetersiz 6.
  // (aşırı servis 2026-08-20'de 1→3; gerekçe srcsetParity.test.js'te.)
  assert.match(html, /65 kombinasyon koşturuldu/);
  assert.match(html, /kaynak yetersiz 0/);
  assert.match(html, /aşırı servis 3/);
  assert.match(html, /zoom yetersiz 6/);
});
