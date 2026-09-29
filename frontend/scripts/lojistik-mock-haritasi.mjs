// Lojistik MOCK haritalarını KAYNAKTAN okur — MOGEM-685 F-03.
//
// NEDEN KAYNAKTAN: ekran manifesti (`router/logisticsScreens.js`) açılış
// paketinde. Haritaları oradan içe aktarmak api modüllerini — önizleme
// derlemesinde onların tohum verisiyle birlikte — açılış paketine çekiyordu
// (ölçüldü 29 Eyl: varsayılan derlemede +2,4 KB gzip). Haritalar sabit
// literal; `packagingContract.test.js` de aynı nedenle kaynaktan okuyor.
//
// KULLANANLAR: `vite.config.js` (`define` → `__LOJISTIK_MOCK_BEKLEYEN__`),
// `.storybook/main.js`, `scripts/node-test-setup.mjs`.
//
// Harita değeri `true`/`false` literali DEĞİLSE derleme DURUR: sessizce
// "bekleyen yok" demek, ucu yazılmamış ekranları PROD'da açardı.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BLOK_BASI = "export const MOCK = {";

/**
 * `src/api/*.js` içindeki her `export const MOCK = {…}` haritası.
 *
 * @param {string} apiDizini `src/api` yolu
 * @returns {Record<string, Record<string, boolean>>} modül adı → uç → açık mı
 */
export function mockHaritalari(apiDizini) {
  const sonuc = {};
  for (const ad of readdirSync(apiDizini).sort()) {
    if (!ad.endsWith(".js")) continue;
    const kaynak = readFileSync(join(apiDizini, ad), "utf8");
    const bas = kaynak.indexOf(BLOK_BASI);
    if (bas < 0) continue;
    const son = kaynak.indexOf("\n};", bas);
    if (son < 0) throw new Error(`[lojistik-mock] ${ad}: MOCK haritasının sonu bulunamadı`);
    const harita = {};
    for (const ham of kaynak.slice(bas + BLOK_BASI.length, son).split("\n")) {
      const satir = ham.replace(/\/\/.*$/, "").trim();
      if (!satir || satir.startsWith("*") || satir.startsWith("/*")) continue;
      const m = /^(\w+):\s*(true|false),?$/.exec(satir);
      if (!m) {
        throw new Error(
          `[lojistik-mock] ${ad}: MOCK satırı true/false literali değil: "${satir}" — ` +
            "ekran görünürlüğü bu haritadan derleme anında okunuyor"
        );
      }
      harita[m[1]] = m[2] === "true";
    }
    sonuc[ad.replace(/\.js$/, "")] = harita;
  }
  return sonuc;
}

/** En az bir ucu hâlâ mock'ta olan api modülleri (sıralı). */
export function bekleyenModuller(apiDizini) {
  return Object.entries(mockHaritalari(apiDizini))
    .filter(([, harita]) => Object.values(harita).some(Boolean))
    .map(([ad]) => ad);
}
