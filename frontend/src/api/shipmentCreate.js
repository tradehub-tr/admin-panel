// Manuel sevkiyat oluşturma API istemcisi (C1 · TUR-107).
//
// Backend hedefi: tradehub_core.api.v1.shipment.create_manual_shipment —
// HENÜZ YAZILMADI (06-BE). Mevcut `create_shipment` yalnız order/items/
// idempotency_key alıyor; formun kanal, taşıyıcı, takip no, tarih, maliyet
// ve sürücü/plaka alanları uçta karşılıksız (C1 manifest kaydının eski
// `blockedBy` ölçümü). Ekranı uca budayarak bağlamak C1'i boşaltırdı;
// bunun yerine 13-FE paketleme deseni uygulanıyor: ekran SÖZLEŞMEYİ
// tüketiyor, uç yazılınca aşağıdaki MOCK satırı `false` yapılıyor ve ekran
// kodu DEĞİŞMİYOR.
//
// SÖZLEŞME (06-BE bunu referans alacak):
//   create_manual_shipment(payload) — payload alanları:
//     order (zorunlu), channel (zorunlu), cost_paid_by (zorunlu),
//     carrier (kargo kanallarında zorunlu), carrier_service?,
//     tracking_number?, driver_name?, vehicle_plate?,
//     ship_date?, estimated_delivery?, carrier_cost?, customer_charge?,
//     idempotency_key (istemci üretir — çift tıklama yeni kayıt açmasın)
//   Dönüş: { name, order, status: "Draft" }
//   Hatalar: VALIDATION_FAILED (eksik/uyumsuz alan), PERMISSION_DENIED.

import api from "@/utils/api";

import { LogisticsApiError, unwrap } from "./logistics";

/**
 * Uç bazında mock anahtarı (packaging.js deseni). Uç yazılınca satır
 * `false` yapılır; ekran ve view değişmez.
 */
export const MOCK = {
  create_manual_shipment: true,
};

/** Mock'ta üretilen sıra numarası — Math.random yasak (tekrarlanabilirlik). */
let mockSequence = 0;

const REQUIRED = ["order", "channel", "cost_paid_by"];
const CARRIER_LESS = ["SELLER_VEHICLE", "BUYER_PICKUP"];

function mockCreate(payload) {
  const missing = REQUIRED.filter((k) => !payload?.[k]);
  if (!CARRIER_LESS.includes(payload?.channel) && !payload?.carrier) missing.push("carrier");
  if (missing.length) {
    throw new LogisticsApiError({
      code: "VALIDATION_FAILED",
      message: `Zorunlu alan(lar) eksik: ${missing.join(", ")}`,
    });
  }
  mockSequence += 1;
  return {
    name: `SHP-DEMO-${String(mockSequence).padStart(5, "0")}`,
    order: payload.order,
    status: "Draft",
  };
}

/**
 * Manuel sevkiyat taslağı oluşturur.
 *
 * Mock modunda kayıt SUNUCUYA GİTMEZ — dönen ad `SHP-DEMO-*` önekiyle
 * ayırt edilir ve view detaya değil listeye döner (listede görünmeyecek
 * sahte bir kaydın 404 detayına götürmemek için).
 */
export async function createManualShipment(payload) {
  if (MOCK.create_manual_shipment) return mockCreate(payload);

  return unwrap(
    await api.callMethod("tradehub_core.api.v1.shipment.create_manual_shipment", {
      payload: JSON.stringify(payload),
    })
  );
}
