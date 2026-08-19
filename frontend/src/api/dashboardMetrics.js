// Lojistik pano API istemcisi (A1 · TUR-117/118).
//
// Backend hedefi: tradehub_core.api.v1.logistics.get_dashboard_metrics —
// HENÜZ YAZILMADI (16-BE). 13-FE paketleme deseni: MOCK satırı uç yazılınca
// `false` yapılır, ekran değişmez.
//
// SÖZLEŞME (16-BE bunu referans alacak):
//   get_dashboard_metrics() →
//     {
//       metrics: {
//         active: n,              // terminal olmayan sevkiyat sayısı
//         delayed: n,             // A2 "delayed" kovasıyla AYNI tanım/sorgu —
//                                 // iki ekran farklı sayı gösterirse güven biter
//         failed: n,              // açık (resolved_at boş) Critical istisna sayısı,
//                                 // A3 sayaçlarıyla aynı kaynaktan
//         avg_delivery_days: x,   // son 30 günde teslim edilenlerin ortalaması,
//                                 // teslim edilen yoksa null (0 değil — 0 "aynı
//                                 // gün teslim" demek olurdu)
//       },
//       status_counts: { Draft: n, Pending: n, ... }  // terminal dahil tüm durumlar
//     }
//   * Tek uç, tek yanıt: KPI'lar ve dağılım ayrı isteklerle çekilirse sayılar
//     birbirinden kayar (13-FE §2.1 kuralının pano hali).

import api from "@/utils/api";

import { unwrap } from "./logistics";

/** Uç bazında mock anahtarı (packaging.js deseni). */
export const MOCK = {
  get_dashboard_metrics: true,
};

// Mock — A2/A3 mock verileriyle TUTARLI: delayed=2 (pendingWork "delayed"
// kovasının 2 kaydı), failed=2 (exceptions'taki 2 açık Critical),
// Pending=5 (pendingWork mock'unda Pending statülü 5 sevkiyat) — böylece
// terminal olmayan statülerin toplamı (5+1+2+1) metrics.active=9 ile tutar.
const MOCK_PAYLOAD = {
  metrics: {
    active: 9,
    delayed: 2,
    failed: 2,
    avg_delivery_days: 2.4,
  },
  status_counts: {
    Pending: 5,
    "Ready for Pickup": 1,
    "In Transit": 2,
    "At Warehouse": 1,
    Delivered: 6,
    Cancelled: 1,
  },
};

/** Pano metrikleri — camelCase'e burada çevrilir, ekran sözleşme bilmez. */
export async function getDashboardMetrics() {
  const data = MOCK.get_dashboard_metrics
    ? MOCK_PAYLOAD
    : unwrap(await api.callMethodGET("tradehub_core.api.v1.logistics.get_dashboard_metrics"));

  return {
    metrics: {
      active: data?.metrics?.active ?? null,
      delayed: data?.metrics?.delayed ?? null,
      failed: data?.metrics?.failed ?? null,
      avgDeliveryDays: data?.metrics?.avg_delivery_days ?? null,
    },
    statusCounts: data?.status_counts ?? {},
  };
}
