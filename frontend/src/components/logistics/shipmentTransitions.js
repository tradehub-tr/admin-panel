// Sevkiyat durum geçiş haritası — `constants.py` ALLOWED_TRANSITIONS'ın KOPYASI.
//
// NEDEN KOPYA:
//   Geçiş kuralı bir sözleşme kuralı, arayüz kararı değil. Otoritesi
//   `tradehub_core/logistics/constants.py`. Ama onu döndüren bir uç YOK —
//   `update_shipment_status` kuralı yalnız UYGULUYOR, açıklamıyor. Panelin
//   "hangi duruma geçilebilir" listesini çizebilmesi için haritanın istemcide
//   de bulunması gerekiyor.
//
// NEDEN GÜVENLİ:
//   Kopya elle senkron tutulmuyor. `__tests__/shipmentTransitions.test.js`
//   Python kaynağını okuyup bu dosyayla karşılaştırıyor — biri değişip diğeri
//   değişmezse test kırmızı olur. Kopyanın tehlikesi sessiz kaymasıydı; kayma
//   artık sessiz değil.
//
// BU HARİTA YETKİ DEĞİL:
//   Geçişin gerçekten yapılabilir olup olmadığına backend karar veriyor
//   (`transition_status` → `ShipmentStateError`). Burası yalnız kullanıcıya
//   reddedileceği belli olan seçeneği göstermemek için.

/** @type {Record<string, string[]>} kaynak durum → izin verilen hedefler */
export const ALLOWED_TRANSITIONS = {
  Draft: ["Cancelled", "Pending"],
  Pending: ["Cancelled", "Ready for Pickup"],
  "Ready for Pickup": ["Cancelled", "Picked Up"],
  "Picked Up": ["Cancelled", "In Transit"],
  "In Transit": ["At Warehouse", "Cancelled", "Delivered", "Failed", "Out for Delivery"],
  "At Warehouse": ["Cancelled", "In Transit", "Out for Delivery"],
  "Out for Delivery": ["Delivered", "Failed", "Returned"],
  Failed: ["Cancelled", "In Transit", "Returned"],
};

/**
 * Satıcının yapabileceği geçişler — `constants.py` SELLER_ALLOWED_TRANSITIONS
 * kopyası (G0 matrisi C2, senkron testi aynı dosyada).
 *
 * Satıcıya tam haritayı sunmak her seçeneği backend'in 403'üyle
 * sonuçlandırırdı; dar yol tek geçişe izin veriyor: "kargoya verildi"
 * (FBM confirm-shipment deseni). C2 container'ı satıcıda bu haritayı geçer.
 */
export const SELLER_ALLOWED_TRANSITIONS = {
  "Ready for Pickup": ["Picked Up"],
};
