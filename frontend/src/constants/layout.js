// Uygulama kabuğunun (AppLayout) YAPISAL sabitleri — saf modül, hiçbir şey
// import etmez.
//
// NEDEN AYRI DOSYA (SOLID denetimi, 2026-08-24):
//   `PAGE_MAIN_ID` `router/pageTitle.js` içinde yaşıyordu. Orada durmasının
//   gerekçesi döngüsel bağımlılıktı (`router/index.js` → `AppLayout.vue`), ama
//   sonuç şu oldu: rotayla HİÇBİR ilgisi olmayan ortak bileşenler
//   (`ConfirmDialog`, `DataTable`) tek bir string uğruna ROUTER katmanını
//   import etti. Sabit artık kimsenin katmanına ait olmayan bir evde; router da
//   layout da ortak bileşenler de aynı yerden okuyabilir.

/**
 * Rota değişiminde odağın taşındığı ana içerik sarmalayıcısının id'si
 * (`AppLayout` içindeki `<main>`; odağı `router/index.js` `afterEach`i taşıyor).
 *
 * Kapanan katmanlar (dialog, popover) tetikleyicileri DOM'dan kalkmışsa odağı
 * bu kaba iade eder — bkz. `components/common/focusTrap.js` `restoreFocus`.
 */
export const PAGE_MAIN_ID = "page-main";
