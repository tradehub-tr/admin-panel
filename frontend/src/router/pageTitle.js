// Sayfa başlığının SAF HESABI — DOM yok, Vue yok, import yok.
//
// Bu dosya yalnız "rota meta'sından hangi metin çıkar" sorusunu cevaplar.
// Başlığı DOM'a yazan, odağı taşıyan ve duyuran davranış
// `composables/useRouteAnnouncement.js` içinde; onu ne zaman çağıracağına
// `router/index.js` `afterEach`i karar veriyor.
//
// NEDEN AYRI DOSYA:
//   `document.title` panelde HİÇ güncellenmiyordu: 40+ ekranda sekme adı
//   "iStoc B2B - Satıcı Paneli" olarak sabitti. Ekran okuyucu kullanıcısı
//   sekmeler arasında geçerken hangi sayfada olduğunu duyamıyor, tarayıcı
//   geçmişi/yer imleri ayırt edilemiyordu (WCAG 2.4.2 — Page Titled).
//
//   Hesap `router/index.js` içinde kalsaydı test edilemezdi: o dosya
//   `@/` alias'ı ve `.vue` bileşenleri import ediyor, `node --test` onu
//   Vite olmadan yükleyemez. Burada import YOK — başlık kuralı doğrudan
//   test ediliyor (`__tests__/pageTitle.test.js`).

/**
 * Marka adı — `index.html`deki `<title>`ın gövdesiyle aynı ("iStoc B2B -
 * Satıcı Paneli"). Sekme dar olduğunda ekran adı görünsün diye başta
 * ekran, sonra marka yazılıyor.
 */
export const BRAND = "iStoc B2B";

/**
 * Rota değişiminde odağın taşındığı ana içerik sarmalayıcısının id'si
 * (`AppLayout` `<main>`; odağı `router/index.js` `afterEach`i taşıyor).
 *
 * Sabit BURADA, çünkü `router/index.js` `AppLayout.vue`yu import ediyor —
 * layout da oradan import etseydi döngüsel bağımlılık oluşurdu. Bu dosya
 * hiçbir şey import etmiyor, iki taraf da güvenle okuyabilir.
 */
export const PAGE_MAIN_ID = "page-main";

/** Ekran adı ile marka arasındaki ayraç. */
export const TITLE_SEPARATOR = "·";

/**
 * Rota meta'sından ekranın okunur adı.
 *
 * Öncelik `meta.titleKey` (i18n anahtarı — lojistik rotaları manifestteki
 * `labelKey`i buraya taşıyor), sonra `meta.title` (panelin eski, TR sabit
 * başlıkları). Çeviri bulunamazsa sabit başlığa düşülür; yarım çeviri
 * yüzünden başlık ham anahtar ("nav.item.x") olmaz.
 *
 * @param {object|null|undefined} meta Rota meta nesnesi.
 * @param {((key: string) => string|null|undefined)|null} [translate]
 *   Anahtarı çeviren fonksiyon; çeviri yoksa boş/null döndürmeli.
 * @returns {string} Ekran adı; bilinmiyorsa boş string.
 */
export function pageNameFor(meta, translate) {
  const key = meta?.titleKey;
  const translated = key && typeof translate === "function" ? translate(key) : null;
  const name = translated || meta?.title || "";
  return String(name).trim();
}

/**
 * Sekme başlığı — "<Ekran adı> · iStoc B2B".
 *
 * Adı olmayan rotada (login, yönlendirmeler) yalnız marka döner; başında
 * boş ayraç bırakmak sekmede "· iStoc B2B" gibi görünürdü.
 *
 * @param {object|null|undefined} meta
 * @param {((key: string) => string|null|undefined)|null} [translate]
 * @returns {string}
 */
export function pageTitleFor(meta, translate) {
  const name = pageNameFor(meta, translate);
  return name ? `${name} ${TITLE_SEPARATOR} ${BRAND}` : BRAND;
}

/** Ekranı adlandıran hiçbir alan yoksa düşülen son çare. */
export const LOGISTICS_FALLBACK_TITLE = "Lojistik";

/**
 * Lojistik manifest kaydından rota meta'sının BAŞLIK alanları.
 *
 * TEK KAYNAK: `router/index.js` rotayı bundan kuruyor, `__tests__/
 * pageTitle.test.js` başlıkların birbirinden farklı olduğunu bununla
 * doğruluyor. İki taraf ayrı ayrı meta kursaydı test gerçeği değil kendi
 * kopyasını sınardı.
 *
 * `titleKey` önce `screen.titleKey`den okunuyor, sonra `screen.labelKey`den:
 * menüde görünen ekranın sekme adı MENÜ ETİKETİYLE aynı olmalı (ikinci bir
 * başlık listesi tutulsaydı menüde "Raporlar", sekmede başka şey yazardı).
 * Parametreli detay rotalarının menü kalemi yok — onlar kendi `titleKey`ini
 * taşır ve çeviri gelene kadar `title` sabitine düşer.
 *
 * @param {{title?: string, titleKey?: string, labelKey?: string}|null} screen
 * @returns {{title: string, titleKey?: string}}
 */
export function logisticsTitleMeta(screen) {
  const titleKey = screen?.titleKey || screen?.labelKey;
  return {
    title: screen?.title || LOGISTICS_FALLBACK_TITLE,
    ...(titleKey ? { titleKey } : {}),
  };
}
