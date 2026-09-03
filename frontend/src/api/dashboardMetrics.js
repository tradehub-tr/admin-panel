// Lojistik pano API istemcisi (A1 · TUR-117/118).
//
// Backend hedefi: tradehub_core.api.v1.logistics_ops.get_dashboard_metrics —
// HENÜZ YAZILMADI (16-BE). 13-FE paketleme deseni: MOCK satırı uç yazılınca
// `false` yapılır, ekran değişmez.
// Modül adresi guest v1.logistics'ten bilinçli ayrıldı — admin ucu guest
// modülüne eklenmez (yanlışlıkla-guest riski).
//
// SÖZLEŞME (16-BE bunu referans alacak):
//   get_dashboard_metrics() →
//     {
//       metrics: {
//         active: n,              // terminal olmayan sevkiyat sayısı
//         delayed: n,             // A2 "delayed" kovasıyla AYNI tanım/sorgu —
//                                 // iki ekran farklı sayı gösterirse güven biter
//         failed: n,              // AÇIK (resolved_at boş) Critical istisna
//                                 // sayısı — A3 `severity_counts.Critical`
//                                 // ile AYNI sorgu. A3 sayacı da çözülmüşleri
//                                 // DIŞLIYOR (QA denetimi 2026-08-24: tanım
//                                 // burada "açık" diyordu, exceptionsMock ise
//                                 // çözülmüşleri de sayıyordu; o gün ikisi
//                                 // tesadüfen 2/2 tuttuğu için fark
//                                 // görülmemişti). Panodan tıklayan kullanıcı
//                                 // A3'te AYNI sayıda kayıt görmeli.
//         avg_delivery_days: x,   // son 30 günde teslim edilenlerin ortalaması,
//                                 // teslim edilen yoksa null (0 değil — 0 "aynı
//                                 // gün teslim" demek olurdu)
//       },
//       status_counts: { Draft: n, Pending: n, ... }  // terminal dahil tüm durumlar
//     }
//   * Tek uç, tek yanıt: KPI'lar ve dağılım ayrı isteklerle çekilirse sayılar
//     birbirinden kayar (13-FE §2.1 kuralının pano hali).
//   * Rol kapısı ENUMERE (pendingWork.js kuralıyla aynı): platform ekranı —
//     get_dashboard_metrics yalnız Logistics Operator+ rollerine açılır;
//     SATICIYA BU UÇ HİÇ AÇILMAZ.
//   * avg_delivery_days: 16-BE/17-BE AYNI sorgu tanımını kullanır
//     (reports.get_performance_report.avg_delivery_days) — pano ile rapor
//     farklı ortalama söylerse güven biter.

import { exceptionsMock } from "./exceptionsMock.js";
import { LOGISTICS_METHOD, logisticsGet } from "./logisticsClient";
import { defaultReportRange, reportsMock } from "./reportsMock.js";

/** Uç bazında mock anahtarı (packaging.js deseni). */
export const MOCK = {
  get_dashboard_metrics: true,
};

/**
 * Pano ortalaması L2 raporunun TA KENDİSİ — elle yazılmış sabit DEĞİL.
 *
 * ÖLÇÜLDÜ (QA denetimi 2026-08-24): burada `2.76` yazıyordu ve "reportsMock
 * ile hizalı" deniyordu; oysa `reportsMock` KAYAN "son 30 gün" üzerinden
 * hesaplıyor, yani doğru rakam her gün değişiyordu (08-20'de 2.81, o gün
 * 2.76, 09-01'de 2.74) ve hiçbir test bunu tutmuyordu. Sözleşmenin en üstte
 * verdiği söz — "pano ile rapor AYNI ortalamayı söyler" — sessizce yalan
 * olmuştu. İddia artık kaynağından türetiliyor; kayarsa birlikte kayar.
 *
 * Tembel: yalnız mock açıkken ve istek geldiğinde hesaplanır (30 gün × 4
 * taşıyıcı), modül yüklenirken değil.
 */
function mockPayload() {
  const { from, to } = defaultReportRange();
  return {
    // A2/A3 mock verileriyle TUTARLI: delayed=2 (pendingWork "delayed"
    // kovasının 2 kaydı), Pending=5 (pendingWork mock'unda Pending statülü
    // 5 sevkiyat) — böylece terminal olmayan statülerin toplamı (5+1+2+1)
    // metrics.active=9 ile tutar.
    //
    // `failed` SABİT DEĞİL, A3 mock'unun ta kendisinden türetiliyor (E2E
    // denetimi 2026-09-03): sözleşme "A3 severity_counts.Critical ile AYNI
    // kaynak" diyor ama burada `failed: 2` sabiti vardı — A3'te bir Critical
    // çözülünce pano düşmüyor, iki ekran aynı SPA oturumunda ayrışıyordu
    // (avg_delivery_days'in 08-24'te kapanan sabitiyle aynı hastalık).
    // Kaynağından türetildiği için artık kayarsa birlikte kayar.
    metrics: {
      active: 9,
      delayed: 2,
      failed: exceptionsMock.list().severity_counts.Critical,
      avg_delivery_days: reportsMock.performance(from, to).avg_delivery_days,
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
}

/** Pano metrikleri — camelCase'e burada çevrilir, ekran sözleşme bilmez. */
export async function getDashboardMetrics() {
  const data = MOCK.get_dashboard_metrics
    ? mockPayload()
    : await logisticsGet(`${LOGISTICS_METHOD.OPS}.get_dashboard_metrics`);

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
