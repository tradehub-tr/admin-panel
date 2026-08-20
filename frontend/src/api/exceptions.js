// İstisna kuyruğu API istemcisi (A3 · TUR-113/118).
//
// Backend hedefi: tradehub_core.api.v1.logistics_ops.list_shipment_exceptions
// + resolve_shipment_exception — HENÜZ YAZILMADI (16-BE). 13-FE paketleme
// deseni: ekran bu sözleşmeyi tüketiyor, uç yazılınca ilgili MOCK satırı
// `false` yapılıyor, ekran değişmiyor.
// Modül adresi guest v1.logistics'ten bilinçli ayrıldı — admin ucu guest
// modülüne eklenmez (yanlışlıkla-guest riski).
//
// SÖZLEŞME (16-BE bunu referans alacak):
//   list_shipment_exceptions({ severity, page, page_size }) →
//     {
//       severity_counts: { Critical: n, Warning: n, Info: n },
//       items: [{ name, shipment, exception_code, exception_label,
//                 description, severity, carrier, occurred_at,
//                 resolved_at, resolved_by, resolution_note }],
//       total,
//     }
//   * severity_counts listeyle AYNI yanıttan (13-FE §2.1 kuralı).
//   * Çözülmüş kayıtlar da döner (resolved_at dolu) — tekrarlayan istisna
//     ancak geçmiş görünürse fark edilir; ekran soluk gösterir.
//
//   resolve_shipment_exception({ name, resolution_note }) → { name, resolved_at }
//   * resolution_note ZORUNLU (TUR-113 AC: "çözüm notu olmadan kapatılamaz")
//     — boşsa VALIDATION_FAILED. Ekran da zorlar, asıl doğrulama backend'de.
//
//   K3 kararı (G0): "yeniden dene" ve "operatöre ata" aksiyonları istisna
//   TİPİNE bağlı (ör. webhook hatasında retry) — uçları 16-BE tanımlayacak,
//   ekran o zaman genişler. İptal gerektiren çözüm Logistics Manager'a
//   eskale edilir, bu ekrana iptal butonu KONMAZ.

import { exceptionsMock } from "./exceptionsMock";
import { LOGISTICS_METHOD, logisticsGet, logisticsPost } from "./logisticsClient";

// Mock verisi/davranışı `exceptionsMock.js`'e taşındı (tam denetim Tur-3,
// 2026-08-20): bu dosya tek geçit üzerinden `@/utils/api`'ye bağlanıyor ve
// node:test o alias'ı çözemiyor — mock saf dosyada kalınca davranışı test
// kilitleyebiliyor (`__tests__/exceptionsMock.test.js`). `resetMockData`
// buradan yeniden dışa açık; çağıranların import yolu değişmedi.
export { resetMockData } from "./exceptionsMock";

/** Uç bazında mock anahtarı (packaging.js deseni). */
export const MOCK = {
  list_shipment_exceptions: true,
  resolve_shipment_exception: true,
};

/** Aktif önem filtresine göre istisnalar + tüm sayaçlar (tek yanıt). */
export async function listShipmentExceptions({ severity = "", page = 1, pageSize = 50 } = {}) {
  if (MOCK.list_shipment_exceptions) return exceptionsMock.list(severity);

  return logisticsGet(`${LOGISTICS_METHOD.OPS}.list_shipment_exceptions`, {
    ...(severity ? { severity } : {}),
    page,
    page_size: pageSize,
  });
}

/** İstisnayı çözüm notuyla kapatır — not zorunlu (TUR-113). */
export async function resolveShipmentException(name, resolutionNote) {
  if (MOCK.resolve_shipment_exception) return exceptionsMock.resolve(name, resolutionNote);

  return logisticsPost(`${LOGISTICS_METHOD.OPS}.resolve_shipment_exception`, {
    name,
    resolution_note: resolutionNote,
  });
}
