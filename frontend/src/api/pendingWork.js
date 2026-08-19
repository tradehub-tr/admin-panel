// Bekleyen işler kuyruğu API istemcisi (A2 · TUR-117/118).
//
// Backend hedefi: tradehub_core.api.v1.logistics.list_pending_work —
// HENÜZ YAZILMADI (16-BE). 13-FE paketleme deseni: ekran bu sözleşmeyi
// tüketiyor, uç yazılınca MOCK satırı `false` yapılıyor, ekran değişmiyor.
//
// SÖZLEŞME (16-BE bunu referans alacak):
//   list_pending_work({ bucket, page, page_size }) →
//     {
//       buckets: { awaiting_carrier: n, awaiting_label: n, awaiting_pickup: n,
//                  awaiting_pod: n, delayed: n },
//       items:   [{ name, order, status, carrier, waiting_hours }],
//       total:   aktif kovanın toplamı,
//     }
//   * `buckets` sayaçları listeyle AYNI yanıttan gelmeli (13-FE §2.1 kuralı):
//     ayrı istekle çekmek sayaçları listeden kaydırır — kullanıcı "Gecikmiş 2"
//     görür, tıklar, 3 kayıt gelir.
//   * `waiting_hours`: işin o kovaya DÜŞTÜĞÜNDEN beri geçen saat — ekranın
//     asıl bilgisi; sıralama varsayılanı bu alan (en uzun bekleyen üstte).
//   * Tenant: platform ekranı — satıcı filtresi yok, rol kapısı var
//     (Logistics Operator+). Satıcıya bu uç hiç açılmaz.

import api from "@/utils/api";

import { unwrap } from "./logistics";

/** Uç bazında mock anahtarı (packaging.js deseni). */
export const MOCK = {
  list_pending_work: true,
};

// ---------------------------------------------------------------------------
// Mock veri — deterministik (Math.random yasak). Eşik davranışı görünsün diye
// bekleme süreleri 24 sa (uyarı) ve 72 sa (kritik) eşiklerinin iki yanında.
// ---------------------------------------------------------------------------

const MOCK_ROWS = {
  awaiting_carrier: [
    { name: "SHP-2026-00051", order: "ORD-2026-00801", status: "Pending", carrier: null, waiting_hours: 5 },
    { name: "SHP-2026-00052", order: "ORD-2026-00802", status: "Pending", carrier: null, waiting_hours: 30 },
  ],
  awaiting_label: [
    { name: "SHP-2026-00053", order: "ORD-2026-00803", status: "Pending", carrier: "Yurtiçi Kargo", waiting_hours: 2 },
    { name: "SHP-2026-00054", order: "ORD-2026-00804", status: "Pending", carrier: "MNG Kargo", waiting_hours: 26 },
    { name: "SHP-2026-00055", order: "ORD-2026-00805", status: "Pending", carrier: "Aras Kargo", waiting_hours: 80 },
  ],
  awaiting_pickup: [
    { name: "SHP-2026-00056", order: "ORD-2026-00806", status: "Ready for Pickup", carrier: "PTT Kargo", waiting_hours: 12 },
  ],
  awaiting_pod: [
    { name: "SHP-2026-00057", order: "ORD-2026-00807", status: "Delivered", carrier: "Sürat Kargo", waiting_hours: 40 },
  ],
  delayed: [
    { name: "SHP-2026-00058", order: "ORD-2026-00808", status: "In Transit", carrier: "Yurtiçi Kargo", waiting_hours: 96 },
    { name: "SHP-2026-00059", order: "ORD-2026-00809", status: "At Warehouse", carrier: "MNG Kargo", waiting_hours: 120 },
  ],
};

function mockList(bucket) {
  const items = [...(MOCK_ROWS[bucket] ?? [])].sort((a, b) => b.waiting_hours - a.waiting_hours);
  return {
    buckets: Object.fromEntries(Object.entries(MOCK_ROWS).map(([k, v]) => [k, v.length])),
    items,
    total: items.length,
  };
}

/** Aktif kovanın işleri + tüm kova sayaçları (tek yanıt — sözleşme kuralı). */
export async function listPendingWork({ bucket = "awaiting_label", page = 1, pageSize = 50 } = {}) {
  if (MOCK.list_pending_work) return mockList(bucket);

  return unwrap(
    await api.callMethodGET("tradehub_core.api.v1.logistics.list_pending_work", {
      bucket,
      page,
      page_size: pageSize,
    })
  );
}
