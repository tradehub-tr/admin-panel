/**
 * HTML sanitizer — v-html ile render edilen untrusted içerik için.
 *
 * Backend Frappe bleach ile sanitize eder, bu fonksiyon defence-in-depth
 * (ikinci katman) olarak çalışır.
 *
 * F-019/F-020: Regex tabanlı sanitizer DOMPurify ile değiştirildi.
 */

import DOMPurify from "dompurify";

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "b",
    "i",
    "u",
    "strong",
    "em",
    "s",
    "strike",
    "sub",
    "sup",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "pre",
    "code",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "div",
    "span",
  ],
  ALLOWED_ATTR: [
    "href",
    "src",
    "alt",
    "title",
    "class",
    "style",
    "target",
    "rel",
    "width",
    "height",
    "colspan",
    "rowspan",
  ],
};

/**
 * Sanitize HTML string — DOMPurify ile script, event handler ve
 * izin verilmeyen tag/attribute'ları temizler.
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

/**
 * `:href` bağlamadan önce ŞEMA denetimi.
 *
 * Vue `:href` değerini escape eder ama şemayı filtrelemez: `javascript:…` ya
 * da `data:text/html;…` bir bağlantı, tıklayan kullanıcının oturumunda kod
 * çalıştırır. Bu, backend'in serbest metin (`Data`) olarak sakladığı her URL
 * alanı için gerçek bir stored-XSS yoludur — çok kiracılı panelde bir
 * satıcının yazdığı değeri yöneticinin tıklaması yetiyor.
 *
 * `admin-panel/.claude/rules/api-security.md` §3'ün "JS injection" satırının
 * uygulaması. Beyaz liste: http, https, kök-göreli yol, mailto, tel.
 *
 * @param {unknown} url Ham değer (genelde API yanıtından).
 * @returns {string|null} Güvenliyse değerin kendisi, değilse `null`.
 *   `null` dönerse bağlantıyı ÇİZME — güvensiz URL'i düz metin göstermek,
 *   tıklanabilir yapmaktan iyidir.
 */
export function safeExternalUrl(url) {
  if (typeof url !== "string") return null;

  /**
   * ÖNCE TEMİZLE, SONRA DOĞRULA — tarayıcının yaptığı sırayla.
   *
   * WHATWG URL ayrıştırıcısı tab (U+0009), LF (U+000A) ve CR (U+000D)
   * karakterlerini ayrıştırmadan ÖNCE dizenin HER YERİNDEN siliyor. Yalnız
   * `.trim()` yapmak baştaki/sondaki boşluğu alır ama ARAYA gömüleni
   * bırakır: ölçüldü, `"/\t/evil.com"` beyaz listenin kök-göreli dalından
   * geçip tarayıcıda `https://evil.com/` oluyordu — `/\evil.com` ile birebir
   * aynı sonuç, yalnız farklı kodlama.
   *
   * Diğer C0 kontrol karakterleri de siliniyor: beyaz liste ÖN EK istediği
   * için silme bir şeyi "geçirir" hâle getiremiyor (ör. `java\x00script:`
   * temizlenince `javascript:` olur ve yine listede yok), ama gizli
   * karakterle yapılan varyant avını bitiriyor.
   *
   * Dönen değer TEMİZLENMİŞ dize: doğrulanan ile bağlanan aynı olmalı,
   * yoksa denetim bir şeyi onaylayıp başka bir şey `href`e gider.
   */
  // Kontrol karakterlerini ELEMEK bu fonksiyonun işi; `no-control-regex`
  // onları yanlışlıkla yazanlar için var, bilerek eleyenler için değil.
  // eslint-disable-next-line no-control-regex
  const trimmed = url.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!trimmed) return null;

  /**
   * PROTOKOL-GÖRELİ ATLATMA.
   *
   * `//evil.com` şemayı atlar ve dış siteye gider. Yalnız iki eğik çizgiyi
   * elemek YETMİYOR: WHATWG URL ayrıştırıcısı ters bölüyü eğik çizgiye
   * normalize ediyor, yani `/\evil.com` ve `\\evil.com` de aynı yere gidiyor
   * (ölçüldü: `new URL("/\\evil.com", "https://panel.istoc.com/x/y").href`
   * → `https://evil.com/`). XSS değil ama açık yönlendirme: operatör iç bir
   * belge sandığı bağlantıyla kimlik avı sayfasına düşer.
   */
  if (/^[/\\]{2}/.test(trimmed)) return null;

  // Kök-göreli dal: `/` ile başlamalı ama ARDINDAN eğik/ters bölü gelmemeli
  // (o durum yukarıda zaten elendi; buradaki negatif ileri-bakış, kuralın
  // tek başına okunduğunda da doğru olması için).
  return /^(https?:\/\/|\/(?![/\\])|mailto:|tel:)/i.test(trimmed) ? trimmed : null;
}

/**
 * Belge bağlantısı — `safeExternalUrl` + KENDİ ürettiğimiz `blob:` adresi.
 *
 * NEDEN AYRI BİR FONKSİYON:
 *   Etiket/irsaliye belgeleri tarayıcıda üretiliyor ve `URL.createObjectURL`
 *   ile bağlanıyor (`views/logistics/labels/labelDocument.js`). `blob:` beyaz
 *   listede olmadığı için "Etiketi aç" bağlantısı HİÇ çizilmiyordu: etiket
 *   üretiliyor, önizlemede barkod görünüyor, ama açılamıyordu (ölçüldü
 *   2026-08-21, `panel-lojistik-paketleme.spec.ts` "GERÇEK ÇIKTI" senaryosu).
 *   `safeExternalUrl`'i gevşetmek onu kullanan yedi çağıranı da gevşetirdi —
 *   oysa oradaki URL'ler BACKEND'den geliyor, buradaki bizim ürettiğimiz.
 *
 * NEDEN GÜVENLİ:
 *   Kabul edilen tek ek biçim `blob:<kendi kaynağımız>/…`. `blob:` adresi
 *   yalnız aynı kaynakta çalışan kod `createObjectURL` çağırınca kayda
 *   giriyor; backend'in yolladığı bir dize aynı biçimde olsa bile kayıtta
 *   karşılığı yok, sekme boş açılır. Yani bu dal saldırgana yeni bir içerik
 *   kaynağı vermiyor, bizim ürettiğimiz belgeyi açılabilir kılıyor.
 *
 * @param {unknown} url Ham değer.
 * @returns {string|null} Güvenliyse değerin kendisi, değilse `null`.
 */
export function safeDocumentUrl(url) {
  if (typeof url !== "string") return null;
  // Kontrol karakterleri `safeExternalUrl` ile AYNI şekilde eleniyor: iki dal
  // aynı dizeyi görmeli, yoksa biri onaylayıp diğeri başka şey bağlar.
  // eslint-disable-next-line no-control-regex
  const trimmed = url.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  const origin = globalThis.location?.origin;
  if (origin && trimmed.startsWith(`blob:${origin}/`)) return trimmed;
  return safeExternalUrl(url);
}
