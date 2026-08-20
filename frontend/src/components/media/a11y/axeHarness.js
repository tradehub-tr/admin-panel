import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { JSDOM, VirtualConsole } from "jsdom";

/**
 * T-095 — MAKİNEYLE ölçülen erişilebilirlik.
 *
 * ## Neden bu dosya var
 *
 * Panelde bugüne kadarki her erişilebilirlik iddiası ELLE YAZILMIŞ bir
 * assertion'dı: "şu şablonda `aria-label` geçiyor mu" diye dizgide arama.
 * Bu, yazdığın kuralı yazdığın gibi doğrular — bilmediğin kuralı hiç
 * sormaz. `axe-core` 100'ü aşkın WCAG kuralını hesaplanmış erişilebilirlik
 * ağacı üzerinde koşturur; aradaki fark "ne aradığımı buldum" ile "ne
 * olduğunu ölçtüm" arasındaki farktır.
 *
 * ## Nasıl koşuyor
 *
 * Tarayıcı YOK. Bileşen `@vue/server-renderer` ile HTML'e çevrilir, HTML
 * `jsdom` içine bir BELGE olarak konur, `axe-core`'un kendi kaynağı o
 * belgeye script olarak enjekte edilir ve `window.axe.run()` çağrılır.
 * (`axe-core`'u Node'dan `import` edip belge geçirmek çalışmaz: paket
 * kendini yüklendiği `window`'a bağlar.)
 *
 * ## NE ÖLÇÜLMÜYOR — bu liste raporun parçası
 *
 * `jsdom`'un düzen motoru yoktur: hiçbir eleman boyanmaz, her
 * `getBoundingClientRect()` sıfır döner. Bu yüzden ölçüme dahil OLMAYAN
 * kurallar aşağıda `UNMEASURABLE_RULES` içinde tek tek yazılı ve gerekçeli.
 * En önemlisi `color-contrast`: gerçek renk hesabı için boyama gerekir.
 * Kontrast ayrıca ölçülüyor — `__tests__/mediaAccessibility.test.js`
 * tokenlerden oranı hesaplıyor — ama BU dosya onu ölçmez.
 *
 * Ayrıca ölçülmeyen: klavye ile gerçek odak sırası, ekran okuyucunun
 * gerçekte ne seslendirdiği, `:focus-visible` halkasının görünürlüğü ve
 * istemci etkileşimi sonrası oluşan DOM (SSR çıktısı hidrasyon ÖNCESİdir).
 */

const require = createRequire(import.meta.url);

/** `axe.min.js` değil, okunabilir kaynak — yığın izi anlamlı kalsın. */
const axeSource = readFileSync(require.resolve("axe-core"), "utf8");

export const AXE_TAGS = Object.freeze(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);

/**
 * `jsdom`'da ANLAMLI SONUÇ ÜRETEMEYEN kurallar. Kapatılmalarının sebebi
 * "geçmiyorlar" değil, "ölçülemiyorlar": kapatılmasalar `incomplete`
 * listesine düşer ve gerçek bulguların arasında gürültü yaparlardı.
 */
export const UNMEASURABLE_RULES = Object.freeze({
  "color-contrast": "renk hesabı boyama ister; jsdom boyamaz",
  "target-size": "dokunma hedefi ölçüsü düzen motoru ister; her rect 0×0",
  "scrollable-region-focusable": "kaydırılabilirlik taşma hesabı ister",
});

/**
 * Parça (fragment) taramasında ANLAMSIZ olan sayfa düzeyi kurallar.
 * Bir bileşen tek başına `<main>` ya da `<h1>` içermek zorunda değildir;
 * bunları bileşene sormak yanlış soru sormaktır. Tam sayfa taraması
 * yapılacaksa bu liste boş geçilmeli.
 */
export const PAGE_LEVEL_RULES = Object.freeze([
  "region",
  "landmark-one-main",
  "page-has-heading-one",
  "bypass",
  "html-has-lang",
  "landmark-unique",
]);

/** Gerçek engel sayılan etki düzeyleri — geçme eşiği bunlara bakar. */
export const BLOCKING_IMPACTS = Object.freeze(["critical", "serious"]);

function buildRuleConfig({ fragment = true, extraDisabled = [] } = {}) {
  const rules = {};
  for (const id of Object.keys(UNMEASURABLE_RULES)) rules[id] = { enabled: false };
  if (fragment) for (const id of PAGE_LEVEL_RULES) rules[id] = { enabled: false };
  for (const id of extraDisabled) rules[id] = { enabled: false };
  return rules;
}

/**
 * Bir HTML parçasını `axe-core` ile tara.
 *
 * @param {string} html Sunucu çıktısı (SSR) ya da elle yazılmış parça.
 * @param {{fragment?: boolean, lang?: string, extraDisabled?: string[]}} [options]
 * @returns {Promise<{violations: object[], incomplete: object[], passes: number}>}
 */
export async function scanHtml(html, options = {}) {
  const { fragment = true, lang = "tr", extraDisabled = [] } = options;

  // `jsdom` uygulamadığı CSS özelliklerini stderr'e döküyor ("Not
  // implemented: getComputedStyle with pseudo-elements"). Bu, ölçümün
  // sonucu değil aracın gürültüsü — test çıktısını kirletmesin.
  const virtualConsole = new VirtualConsole();

  const dom = new JSDOM(
    `<!doctype html><html lang="${lang}"><head><title>axe</title></head><body>${html}</body></html>`,
    { runScripts: "dangerously", pretendToBeVisual: true, virtualConsole }
  );

  const { window } = dom;
  // `axe-core` bazı görünürlük kontrollerinde `matchMedia` çağırıyor;
  // jsdom'da yok. Sahte olan "hiçbir medya sorgusu eşleşmiyor" der —
  // bu, ölçümün varsayımıdır ve bilerek kaydedilmiştir.
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      media: "",
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
  }

  try {
    const script = window.document.createElement("script");
    script.textContent = axeSource;
    window.document.head.appendChild(script);

    const results = await window.axe.run(window.document.body, {
      runOnly: { type: "tag", values: [...AXE_TAGS] },
      rules: buildRuleConfig({ fragment, extraDisabled }),
      resultTypes: ["violations", "incomplete"],
    });

    // `axe.run` sonucu jsdom REALM'inde üretiliyor: dizileri olduğu gibi
    // döndürürsek `Array.prototype`'ları farklı olur ve `deepStrictEqual`
    // "same structure but not reference-equal" der. Yayma (`[...]`) ile
    // ana realm'e kopyalanıyor — bu bir süsleme değil, yoksa her karşılaştırma
    // sessizce yanlış nedenle kırılır.
    return {
      violations: [...results.violations].map(toFinding),
      incomplete: [...results.incomplete].map(toFinding),
      passes: results.passes?.length ?? 0,
      axeVersion: String(window.axe.version),
    };
  } finally {
    window.close();
  }
}

function toFinding(rule) {
  return {
    id: String(rule.id),
    impact: String(rule.impact || ""),
    help: String(rule.help),
    nodes: [...rule.nodes].map((n) => ({
      target: [...n.target].join(" "),
      // İlk 160 karakter yeter: hangi elemanın kastedildiğini gösterir,
      // test çıktısını da şişirmez.
      html: String(n.html || "").slice(0, 160),
    })),
  };
}

/** `critical`/`serious` bulgular — geçme eşiğinin baktığı küme. */
export function blocking(violations) {
  return violations.filter((v) => BLOCKING_IMPACTS.includes(v.impact));
}

/** Hata mesajına konacak okunur özet; boş listede boş dize. */
export function describe(violations) {
  return violations
    .map((v) => `${v.id} [${v.impact}] ×${v.nodes.length} — ${v.nodes[0]?.html || ""}`)
    .join("\n");
}
