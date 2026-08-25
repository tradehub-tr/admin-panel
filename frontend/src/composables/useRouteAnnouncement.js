import { nextTick, ref } from "vue";

import { PAGE_MAIN_ID } from "@/constants/layout";
import { i18n } from "@/i18n";
import { pageNameFor, pageTitleFor } from "@/router/pageTitle";

/**
 * ROTA DEĞİŞİMİNİN ERİŞİLEBİLİRLİK ETKİLERİ (WCAG 2.4.2 · 2.4.3 · 4.1.3).
 *
 * SPA'da gezinme tarayıcı için "sayfa yüklemesi" değil: `document.title`
 * kendiliğinden değişmez ve odak, tıklanan bağlantı DOM'dan kalktığı için
 * `<body>`ye düşer. Ölçüldü (WCAG turu, 2026-08-24): sekme adı 40+ ekranda
 * aynıydı, ekran okuyucu yeni sayfayı hiç duyurmuyordu, klavye kullanıcısı
 * her gezinmeden sonra Tab'a sıfırdan başlıyordu.
 *
 * NEDEN COMPOSABLE, NEDEN ROUTER'DA DEĞİL (SOLID denetimi, 2026-08-24):
 *   Durum (`pageAnnouncement`) ve hesap `router/index.js`ten dışa açılıyordu
 *   ve `App.vue` onu `@/router`dan import ediyordu — yani uygulama kökünün
 *   bağımlılık yüzeyi 1300 satırlık rota tablosuna açılmıştı. Rota tablosu
 *   büyüdükçe `App.vue`nin ne çektiği görünmez oluyordu. Davranış artık
 *   burada; `router/index.js` yalnız NE ZAMAN çağıracağını biliyor.
 */

/**
 * Yeni sayfanın adı — `App.vue`deki sr-only `aria-live="polite"` bölgesi
 * bunu basar. Modül düzeyinde TEK ref (useToast deseni): canlı bölge de
 * uygulamada tek ve router ile `App.vue` aynı değeri paylaşmalı.
 */
const pageAnnouncement = ref("");

/** İlk yükleme tarayıcının kendi duyurusu — üstüne bir de biz konuşmayalım. */
let initialNavigationDone = false;

/**
 * Modül durumunu başlangıç hâline döndürür — TEST ve HMR içindir.
 *
 * `initialNavigationDone` modül düzeyinde bir `let` ve dışarıdan
 * sıfırlanamıyordu (SOLID denetimi 2026-08-25): "ilk gezinme sessiz" kuralı
 * bu yüzden test EDİLEMEZ durumdaydı ve HMR'de bayat kalıyordu — dosya sıcak
 * yeniden yüklendiğinde bayrak `true` takılı kalıp geliştirme oturumunun geri
 * kalanında ilk duyuruyu yutabiliyordu.
 *
 * `import.meta.hot.accept` BİLEREK KURULMADI: bu modülü self-accepting yapmak
 * güncellemeden sonra `router/index.js`i ESKİ örneğe bağlı bırakırdı — çare
 * hastalıktan kötü. Sıfırlama açık bir çağrı olarak duruyor.
 */
export function resetRouteAnnouncement() {
  initialNavigationDone = false;
  pageAnnouncement.value = "";
}

/**
 * Anahtarı çevirir; karşılığı yoksa `null`.
 *
 * `te()` KULLANILMIYOR (WCAG denetimi, 2026-08-24): vue-i18n'de `te()` yalnız
 * AKTİF locale'e bakar, `fallbackLocale`e BAKMAZ. Lojistik `nav.item.*`
 * anahtarları bilinçli olarak yalnız tr+en sözlüklerinde (ar/ru en'e düşer);
 * `te()` yolunda ar/ru'da her lojistik rota `null` alıp `meta.title`a — yani
 * Türkçe sabit "Lojistik"e — düşüyordu: özellik hem ölüydü hem Türkçe metin
 * sızdırıyordu. `t()` fallback zincirini işletiyor; çeviri gerçekten yoksa
 * vue-i18n anahtarın KENDİSİNİ döndürür, onu da burada eliyoruz.
 */
function translateTitle(key) {
  const global = i18n?.global;
  if (!global || !key) return null;
  const value = global.t(key);
  return value === key ? null : value;
}

/**
 * `document.title`ı rotadan üretip yazar; ekranın okunur adını döndürür.
 *
 * Dışa açık, çünkü DİL değişiminde de çağrılması gerekiyor (`App.vue`):
 * gezinme olmadan locale değişirse başlık eski dilde kalırdı.
 *
 * @param {import("vue-router").RouteLocationNormalized|null} route
 * @returns {string} Ekranın markasız adı.
 */
export function applyPageTitle(route) {
  document.title = pageTitleFor(route?.meta, translateTitle);
  return pageNameFor(route?.meta, translateTitle);
}

/**
 * Yeni sayfayı duyurur ve odağı ana içeriğe taşır.
 *
 * İLK GEZİNMEDE SESSİZ: sayfanın kendi yüklenmesini tarayıcı zaten duyuruyor.
 *
 * İKİ TİK, TEK MEKANİZMA DEĞİL (WCAG denetimi, 2026-08-24):
 *   Duyuru ile odak taşıma aynı tikte yapılınca çakışıyordu — canlı bölge
 *   henüz boşken odak değişiyor, odak değişimi `polite` kuyruğunu kesiyor ve
 *   duyurulardan biri yutuluyordu.
 *   İki çözüm vardı: (a) canlı bölgeyi kaldırıp `<main>`e `aria-label`
 *   vermek, (b) odağı bir tik daha geciktirmek. (b) SEÇİLDİ: (a) `<main>`i
 *   çizen `layouts/AppLayout.vue`yu değiştirmeyi gerektiriyor ve o dosya bu
 *   turda başka bir sahipte; ayrıca `aria-label` yolu duyuruyu tarayıcının
 *   odak bildirimine emanet eder, `polite` bölge ise davranışı bizim
 *   elimizde tutar. Sıra: metin basılır → tarayıcı canlı bölgeyi okur →
 *   sonraki tikte odak taşınır.
 *
 * @param {string} pageName Ekranın markasız adı (`applyPageTitle` döndürür).
 */
export function announcePageChange(pageName) {
  if (!initialNavigationDone) {
    initialNavigationDone = true;
    return;
  }
  // Önce boşalt: art arda aynı adlı iki rotada (parametre değişimi) canlı
  // bölgenin metni değişmezse ekran okuyucu hiçbir şey söylemez.
  pageAnnouncement.value = "";
  nextTick(() => {
    pageAnnouncement.value = pageName;
    nextTick(() => {
      // Odak ana içeriğe: `tabindex="-1"` olduğu için Tab sırasına girmez,
      // yalnız programatik olarak alınır (`AppLayout`).
      document.getElementById(PAGE_MAIN_ID)?.focus();
    });
  });
}

/**
 * Canlı bölgeyi basan BİLEŞEN için giriş (`App.vue`).
 *
 * KAPSAM DARALDI (SOLID denetimi 2026-08-25): bu fonksiyon `router/index.js`
 * tarafından da, yani BİLEŞEN DIŞINDA çağrılıyordu. `use*` öneki Vue'da bir
 * söz verir — "bileşen kurulumu içinde çağrılır, lifecycle'a bağlanabilir" —
 * ve burası o sözü tutmuyordu: argüman almıyor, lifecycle kullanmıyor, modül
 * düzeyinde tekil bir değer döndürüyor. Router artık `applyPageTitle` /
 * `announcePageChange` fonksiyonlarını DOĞRUDAN import ediyor; geriye kalan
 * tek meşru çağıran, paylaşılan `pageAnnouncement` ref'ine ihtiyaç duyan
 * `App.vue`.
 *
 * MODÜL `utils/`e TAŞINMADI: dışa açtığı asıl değer bir Vue `ref`i ve
 * `App.vue` onu şablonda unwrap ediyor — yani modül Vue reaktivitesine bağlı,
 * `utils/`in saf-JS sözleşmesine uymuyor (o ağaç `node --test` altında Vue'suz
 * çalışabiliyor). Ayrıca `utils/` bu turda başka bir sahipte.
 *
 * @returns {{ pageAnnouncement: import("vue").Ref<string>,
 *             applyPageTitle: typeof applyPageTitle }}
 */
export function useRouteAnnouncement() {
  return { pageAnnouncement, applyPageTitle };
}
