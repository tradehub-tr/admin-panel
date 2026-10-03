// Bildirim şablonları kapısı (F2 3 Eki 2026 · B4 3 Eki 2026).
//
// DURUM (B4): backend `tradehub_core.api.v1.notification_templates` yazıldı ve yerelde
// gerçek veriyle doğrulandı. Ekranlar YALNIZ gerçek uca bağlı; mock dalı yok.
//
// MOCK NEDEN SİLİNDİ (silmek yerine `true` sabitinin arkasında bırakmak yerine):
//   - Sabit `true` iken her mock dalı ölü koddu; derleyicinin onu atacağına güvenmek
//     yerine dalın kendisi kaldırıldı — PROD'a ve yerel önizleme imajına girmesi imkânsız.
//   - Mock gerçek sözleşmeden ayrışmıştı (save_draft_bulk, request_id, 202 queued,
//     sayfalı sürüm geçmişi, normalize taslak yoktu); tutulsaydı önizlemede yanlış davranışı
//     "doğru" gösterecekti (FE-MOCK-DİSİPLİNİ: mock yalnız ucu YAZILMAMIŞ ekran içindir).
//   - Katalog filtre testlerinin kullandığı olay listesi test fixture'ına taşındı
//     (`utils/notificationTemplates/__tests__/fixtures/eventsSeed.js`).
//
// GERİ ALMA ANAHTARI: aşağıdaki sabit `false` yapılırsa modül menüden ve route'tan düşer
// (ucu bozulan bir sürümde ekranı kapatmak için). Mock'a geri dönülmez.

/** B2 uçları yazıldı ve doğrulandı (B4). `false` → modül gizlenir; mock YOK. */
export const NOTIFICATION_TEMPLATES_BACKEND_READY = true;

/** Modül menüde/route'ta görünür mü? */
export function notificationTemplatesAvailable() {
  return NOTIFICATION_TEMPLATES_BACKEND_READY;
}
