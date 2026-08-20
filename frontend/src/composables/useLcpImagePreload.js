/**
 * T-122 — LCP adayı görsel için `<link rel="preload">` (panel tarafı).
 *
 * NE YAPAR, NE YAPMAZ
 * -------------------
 * `<img>`i tarayıcı ancak DOM'a girdiğinde keşfeder. Bu composable `setup()`
 * sırasında — yani component'in `<img>`i daha OLUŞMADAN — `<head>`e bir
 * preload bağlantısı koyar; istek, Vue ağacı kurulup boyanmadan başlar.
 *
 * **Kazanç ölçülmedi.** Burada "LCP düştü" iddiası YOK; iddia yalnız
 * "keşif daha erken, fazladan bayt yok". Ölçüm ayrı iş (T-124).
 *
 * ÜÇ TUZAK VE GARANTİLERİ
 * -----------------------
 * 1. **Her görseli preload etmek hiçbirini etmemekle aynıdır.** Üst sınır
 *    `MAX_LCP_PRELOADS` = 1 ve sayaç modül değişkeninde DEĞİL, `<head>`deki
 *    işaretçi bağlantının varlığında. Bir ızgaradaki 40 `MediaImage`'ın
 *    hepsi `preload` bayrağıyla basılsa bile ikinci bağlantı OLUŞMAZ.
 * 2. **`imagesrcset`/`imagesizes`.** Bağlantı, `MediaImage`'ın `<source>`/
 *    `<img>` için hesapladığı AYNI computed değerlerden beslenir (ayrı bir
 *    hesap yok). `w` tanımlayıcılı `srcset` varken `sizes` boşsa preload
 *    BASILMAZ — iki tarafın aynı adayı seçeceğini kanıtlayamayız.
 * 3. **Format uyumu.** `<picture>`da tarayıcı, `type`ını desteklediği İLK
 *    `<source>`u alır; preload da tam onu hedefler ve `type`ını taşır.
 *    Desteklenmiyorsa preload hiç atılmaz (spesifikasyon: desteklenmeyen
 *    `type` → getirme yok) ve `<picture>` bir alt biçime düşer. AVIF ve
 *    WebP için İKİ bağlantı basmak çift indirme olurdu; basılmıyor.
 *
 * SPA NOTU
 * --------
 * Panel tek sayfalık: rota değişince `<head>` sıfırlanmaz. Bu yüzden
 * bağlantıyı SAHİPLENEN component söküldüğünde `releaseLcpPreload()` ile
 * geri verir; sonraki rotanın LCP adayı yeniden talep edebilsin. Yönlendirici
 * kancası KULLANILMADI (`router/index.js` bu görevin yetki alanı dışında) —
 * sahiplik component ömrüne bağlı, bu da router'a ihtiyaç bırakmıyor.
 *
 * Vitrin tarafındaki eşi: `tradehubfront/src/components/media/LcpPreload.ts`.
 * Kurallar birebir aynı; ortak paket olmadığı için kod paylaşılmıyor.
 */

import { getCurrentInstance, onBeforeUnmount } from "vue";

/**
 * Bir belgede aynı anda kaç LCP preload'u olabilir. Bir. Sabit burada
 * duruyor ki artırmak bilinçli bir düzenleme olsun, kazara olmasın.
 */
export const MAX_LCP_PRELOADS = 1;

/** Bastığımız bağlantıyı tanıyan işaretçi — üst sınırın DOM'daki sayacı. */
export const LCP_PRELOAD_MARKER = "data-lcp-preload";

function belge(doc) {
  if (doc) return doc;
  return typeof document === "undefined" ? null : document;
}

/**
 * Adres güvenli mi. `javascript:`/`data:` gibi şemalar reddedilir; göreli
 * yollar ve `http(s)` kabul edilir.
 *
 * @param {string} url
 * @returns {boolean}
 */
function guvenliAdres(url) {
  const raw = String(url || "").trim();
  if (!raw) return false;
  // Protokole göreli adres — açık yönlendirme riski.
  if (raw.startsWith("//")) return false;
  if (/^[/?#]/.test(raw)) return true;
  // Kontrol karakterleriyle şema kaçakçılığı ("java\nscript:") kapanır.
  // eslint-disable-next-line no-control-regex -- bilinçli: şema kaçakçılığı
  const stripped = raw.replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
  if (/^[a-z][a-z0-9+.-]*:/i.test(stripped)) return /^https?:/i.test(stripped);
  return true;
}

/**
 * `srcset` dizgesini sınıflandır.
 *
 * @param {string} srcset
 * @returns {"w"|"other"|"unsafe"|"empty"}
 */
function srcsetTuru(srcset) {
  const parcalar = String(srcset || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parcalar.length) return "empty";
  let hepsiW = true;
  for (const parca of parcalar) {
    const bosluk = parca.search(/\s/);
    const url = bosluk === -1 ? parca : parca.slice(0, bosluk);
    const tanim = bosluk === -1 ? "" : parca.slice(bosluk + 1).trim();
    if (!guvenliAdres(url)) return "unsafe";
    if (!/^\d+w$/.test(tanim)) hepsiW = false;
  }
  return hepsiW ? "w" : "other";
}

/**
 * Bu belgede zaten bir LCP preload'u var mı.
 *
 * @param {Document} [doc]
 * @returns {boolean}
 */
export function hasLcpPreload(doc) {
  const d = belge(doc);
  if (!d || !d.head) return false;
  return d.head.querySelectorAll(`link[${LCP_PRELOAD_MARKER}]`).length >= MAX_LCP_PRELOADS;
}

/**
 * LCP adayı için `<link rel="preload">` bas. **En fazla bir kez.**
 *
 * **Asla fırlatmaz** — bir hızlandırma, panelin açılış koşulu değil.
 *
 * @param {{src?: string, srcset?: string, sizes?: string, type?: string}} source
 *        Tarayıcının GERÇEKTEN indireceği kaynağın tarifi. `srcset` verilirse
 *        `<img>`/`<source>` üzerindekiyle BİREBİR aynı dizge olmalı.
 * @param {Document} [doc]
 * @returns {boolean} bağlantı basıldıysa `true`. `false` dönen her yol bir
 *          "basmamak daha doğru" kararıdır; gerekçeler kodda yazılı.
 */
export function preloadLcpImage(source, doc) {
  try {
    const d = belge(doc);
    if (!d || !d.head || !source) return false;
    if (hasLcpPreload(d)) return false;

    const tur = srcsetTuru(source.srcset);
    if (tur === "unsafe") return false;
    // `x` tanımlayıcılı ya da tanımlayıcısız srcset: seçim DPR'a bağlı,
    // `imagesizes` anlamsız. Preload'un `<img>` ile aynı adayı seçeceğini
    // garanti edemeyiz → basmayız.
    if (tur === "other") return false;
    // `w` srcset'te `sizes` şart: yoksa tarayıcı `100vw` varsayar ve iki
    // tarafın aynı adaya çözüleceğini KANITLAYAMAYIZ.
    if (tur === "w" && !source.sizes) return false;
    if (tur === "empty" && !guvenliAdres(source.src)) return false;

    const link = d.createElement("link");
    link.setAttribute("rel", "preload");
    link.setAttribute("as", "image");
    if (tur === "w") {
      link.setAttribute("imagesrcset", source.srcset);
      link.setAttribute("imagesizes", source.sizes);
      // `href` BİLİNÇLİ YAZILMIYOR: `imagesrcset` bilmeyen eski bir tarayıcı
      // `href`i indirir ama `<img>` için kendi `srcset`inden BAŞKA bir aday
      // seçer → iki indirme. `href`siz preload'u anlamayan tarayıcı hiçbir
      // şey indirmez → kazanç yok, regresyon da yok.
    } else {
      link.setAttribute("href", source.src);
    }
    if (source.type) link.setAttribute("type", source.type);
    // `<img fetchpriority="high">` ile aynı sinyal.
    link.setAttribute("fetchpriority", "high");
    link.setAttribute(LCP_PRELOAD_MARKER, "");
    d.head.appendChild(link);
    return true;
  } catch {
    return false;
  }
}

/**
 * Basılmış bağlantıyı kaldır, üst sınırı serbest bırak. **Asla fırlatmaz.**
 *
 * @param {Document} [doc]
 */
export function releaseLcpPreload(doc) {
  try {
    const d = belge(doc);
    if (!d || !d.head) return;
    for (const link of Array.from(d.head.querySelectorAll(`link[${LCP_PRELOAD_MARKER}]`))) {
      link.remove();
    }
  } catch {
    // Bir hızlandırmanın temizliği uygulamayı düşüremez.
  }
}

/**
 * Component ömrüne bağlı LCP preload'u.
 *
 * `setup()` içinde çağrılır: bağlantı O ANDA basılır — component'in `<img>`i
 * daha DOM'a girmemişken. Bağlantıyı bu component talep ettiyse söküldüğünde
 * geri verir (SPA'da sonraki rota kendi LCP adayını talep edebilsin).
 *
 * Component dışından da çağrılabilir; o zaman yaşam döngüsü bağlanmaz.
 *
 * @param {{src?: string, srcset?: string, sizes?: string, type?: string}} source
 * @returns {boolean} bu çağrı bağlantıyı bastıysa `true`
 */
export function useLcpImagePreload(source) {
  const sahip = preloadLcpImage(source);
  if (sahip && getCurrentInstance()) {
    onBeforeUnmount(() => releaseLcpPreload());
  }
  return sahip;
}
