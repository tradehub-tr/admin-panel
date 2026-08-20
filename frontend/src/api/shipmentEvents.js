// Sevkiyat olay akışı API istemcisi (11-FE · TUR-112/115).
//
// Backend hedefi: tradehub_core.api.v1.shipment.list_shipment_events —
// HENÜZ YAZILMADI (11-BE, sahibi Bora). `Shipment Event` child tablo DEĞİL,
// `shipment` link alanıyla bağlı ayrı DocType; `get_shipment_detail`
// (doc.as_dict) bu yüzden olay taşıyamıyor — ayrı uç şart. 13-FE deseni:
// ekran bu sözleşmeyi tüketiyor, uç yazılınca MOCK satırı `false` olur.
//
// SÖZLEŞME (11-BE bunu referans alacak):
//   list_shipment_events(shipment) →
//     {
//       items: [{
//         event_time, status, source, actor,
//         description?, location?, carrier_status_code?, carrier_status_text?,
//         reason?, dedupe_key,
//       }],
//       tracking_url: string | null,
//     }
//   * Alan eşlemesi (Shipment Event DocType → DTO):
//       internal_status → status · note → description (Manual kaynakta reason)
//       event_hash → dedupe_key · event_time/source/actor/carrier_status_code aynen
//   * `source` küçük harf sözlüğü: manual | api | webhook | polling
//     (FE rozet sözlüğü EVENT_SOURCE_META bu anahtarlarla çalışıyor;
//     DocType "Manual"/"Webhook"/"Poll"/"System" tutuyorsa uç çevirir).
//   * Sıralama sunucuda GEREKMEZ — ekran event_time'a göre kendisi sıralar.
//   * `tracking_url`: taşıyıcının takip sayfası (provider'a 11-BE'de
//     eklenecek şablondan sunucu üretir; şablon yoksa null). Şablon
//     PLATFORM-yönetimli katalog verisidir (tenant yazamaz) ve sunucu
//     çıktıyı https şemasına zorlar (http reddedilir); `tracking_url`
//     olaylarla aynı yetki sınırına tabidir. FE yine de href'e basmadan
//     önce safeExternalUrl süzgecinden geçirir — istemci sunucuya körü
//     körüne güvenmez.
//   * Tenant sınırı `shipment_event_query_conditions` (permissions.py) —
//     satıcı kendi tenant'ının olaylarını görür, BUYER BU UÇTAN OLAY
//     ALAMAZ (buyer'a "1=0" döner — permissions.py:502 tasarım kararı):
//     manuel notlar, operatör e-postaları ve ham taşıyıcı kodları
//     operasyonel veridir. shipment_query_conditions ile AYNI DEĞİL —
//     o Shipment okumasını buyer'a da açar.
//   * Uygulama deseni ZORUNLU: `frappe.get_doc("Shipment", shipment)` +
//     `doc.check_permission("read")` ardından
//     `frappe.get_list("Shipment Event", filters={"shipment": ...})` —
//     get_all YASAK (query_conditions'ı atlar, IDOR kapısı).

import { LOGISTICS_METHOD, logisticsGet } from "./logisticsClient";

/** Uç bazında mock anahtarı (packaging.js deseni). */
export const MOCK = {
  list_shipment_events: true,
};

// ---------------------------------------------------------------------------
// Mock — deterministik tek senaryo: Yolda durumundaki bir sevkiyatın tam
// geçmişi. Kaynak çeşitliliği bilinçli (manuel + webhook + polling + api):
// filtrelerin ve rozetlerin davranışı ancak karışık akışta görünür.
// Son olay ~3 gün eski → "sessizlik" şeridi mock'ta da tetiklenir.
// ---------------------------------------------------------------------------

const MOCK_EVENTS = [
  {
    event_time: "2026-08-14 09:05:00",
    status: "Pending",
    source: "api",
    actor: "system",
    description: "Sevkiyat taslağı onaylandı.",
    dedupe_key: "ev-001",
  },
  {
    event_time: "2026-08-14 16:40:00",
    status: "Ready for Pickup",
    source: "manual",
    actor: "operator@istoc.demo",
    reason: "Paketleme erken tamamlandı, kurye çağrıldı.",
    dedupe_key: "ev-002",
  },
  {
    event_time: "2026-08-15 10:12:00",
    status: "Picked Up",
    source: "webhook",
    actor: "carrier",
    location: "İstanbul / Bağcılar şube",
    carrier_status_code: "PKD",
    carrier_status_text: "Gönderi alındı",
    dedupe_key: "ev-003",
  },
  {
    event_time: "2026-08-15 22:30:00",
    status: "In Transit",
    source: "webhook",
    actor: "carrier",
    location: "İstanbul aktarma merkezi",
    carrier_status_code: "TRN-01",
    carrier_status_text: "Transfer merkezinde",
    dedupe_key: "ev-004",
  },
  {
    event_time: "2026-08-16 07:45:00",
    status: "In Transit",
    source: "polling",
    actor: "system",
    location: "Ankara aktarma merkezi",
    carrier_status_code: "TRN-02",
    carrier_status_text: "Varış aktarma merkezinde",
    dedupe_key: "ev-005",
  },
  {
    event_time: "2026-08-17 11:20:00",
    status: "In Transit",
    source: "manual",
    actor: "operator@istoc.demo",
    description: "Taşıyıcı arandı; araç arızası nedeniyle rota değişti.",
    reason: "Müşteri gecikme bildirimi istedi.",
    dedupe_key: "ev-006",
  },
];

/** Sevkiyatın olay akışı + takip linki (tek yanıt — sözleşme). */
export async function listShipmentEvents(shipment) {
  if (MOCK.list_shipment_events) {
    return {
      items: MOCK_EVENTS,
      // null çünkü gerçek URL ancak 11-BE takip şablonu üretince gelir;
      // canlı siteye giden sahte link operatörü "takip bozuk" yanıltır.
      tracking_url: null,
    };
  }

  return logisticsGet(`${LOGISTICS_METHOD.SHIPMENT}.list_shipment_events`, { shipment });
}
