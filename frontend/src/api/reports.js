// Rapor API istemcisi (L1 kabuğu + L2/L3 panelleri · TUR-121, 17-FE).
//
// Backend hedefi: tradehub_core.api.v1.reports — HENÜZ YAZILMADI (17-BE,
// Ali). 13-FE paketleme deseni: ekran bu sözleşmeyi tüketiyor, uç yazılınca
// MOCK satırı `false` yapılıyor, ekran değişmiyor.
//
// MODÜL ADRESİ: guest'e açık v1.logistics'e admin ucu EKLENMEZ (yanlışlıkla-
// guest riski — 2026-08 tam denetim kararı). Bora'nın 16-BE dosyası
// logistics_ops'a da yazılmıyor: split kuralı gereği (LOGISTICS-TASK-SPLIT
// §3, "bir modül = bir domain = bir sahip") raporlar Ali'nin KENDİ modülü
// `v1.reports`'ta yaşar.
//
// ═══════════════════════════════════════════════════════════════════════
//  SÖZLEŞME (17-BE bunu referans alacak)
// ═══════════════════════════════════════════════════════════════════════
//  Ortak kurallar:
//    * Tarih aralığı: `date_from`/`date_to` (`YYYY-MM-DD`, iki uç DAHİL).
//      İkisi de verilmezse varsayılan SON 30 GÜN (bugün dahil) — FE ile
//      backend aynı varsayılanı uygular ki URL'siz açılış tutarlı olsun.
//    * CSV: mock döneminde CSV İSTEMCİDE, yüklü kırılım satırlarından
//      üretiliyor (ReportCenterView). CANLIDA uç `?format=csv` ile TAM
//      veriyi sunucudan döndürür (useMediaAudit/export_media_audit deseni:
//      "yalnız görünen sayfayı indirmek yanıltıcı" — rapor kırılımları bugün
//      küçük ama satıcı/kalem kırılımı eklendiğinde sayfalanacak).
//      Sunucu `?format=csv` çıktısı da aynı kaçış kurallarına uyar (formül
//      öneki + RFC4180 tırnaklama — FE karşılığı: utils/csv.js).
//    * Rol kapısı: platform ekranı, satıcıya açılmaz. ENUMERE liste —
//      operasyon/performans uçları: System Manager, Marketplace Admin,
//      Logistics Manager, Logistics Operator. Maliyet ucu: bunlardan
//      `view.logistics_cost` capability taşıyanlar (fiilen SM/MA/LM —
//      Operator'da bu capability YOK).
//    * v1.reports modülünde `allow_guest` KULLANILMAZ — hiçbir uç guest'e
//      açılmaz (2026-08 tam denetim kararı; modülün v1.logistics'ten ayrı
//      yaşama sebebi de bu).
//    * Geçersiz tarih formatı / `from > to` → VALIDATION_ERROR. FE zaten
//      temiz gönderir (ReportCenterView query'yi doğrular, Screen ters
//      aralığı emit etmez) — bu madde derinlemesine savunma.
//
//  get_operations_report({ date_from, date_to }) →
//    { totals: { shipments, delivered, cancelled, failed, on_time_rate },
//      by_status: { <ShipmentStatus>: n, ... },
//      by_carrier: [{ carrier, count, delivered, failed }] }
//    * `on_time_rate` teslim edilenler üzerinden (0..1) — sevkiyat sayısı
//      üzerinden değil; iptaller oranı sulandırmasın.
//    * `totals` kırılımlarla AYNI sorgudan gelmeli (13-FE §2.1 kuralı).
//
//  get_performance_report({ date_from, date_to }) →
//    { avg_delivery_days, on_time_rate, sla_breaches,
//      by_carrier: [{ carrier, avg_days, on_time_rate, shipments }],
//      trend: [{ date, delivered, avg_days }] }
//    * `avg_delivery_days` teslim sayısıyla AĞIRLIKLI ortalama — kırılım
//      ortalamalarının ortalaması değil.
//    * `trend` aralıktaki her gün için bir satır (boş gün 0 ile gelir).
//
//  get_cost_report({ date_from, date_to }) →
//    { total_carrier_cost, total_customer_charge, margin,
//      by_carrier: [{ carrier, cost, charge, margin, shipments }] }
//    * Bu uç `view.logistics_cost` capability İSTER; yetkisizde
//      PERMISSION_DENIED döner ("0 TL" göstermek yanlış bilgi olurdu —
//      B8 maliyet sekmesi kararı). FE ekranı zaten `can.viewCost` kapılı:
//      çifte kapı, View yetkisizken isteği HİÇ atmaz.
//    * `margin` sunucuda hazır hesaplanır (charge − cost); FE yeniden
//      hesaplamaz — yuvarlama farkı iki ekranda iki rakam üretirdi.
//    * Tutarlar TRY. Çoklu para birimi gelirse satır bazında `currency`
//      alanı eklenir (bugünkü operasyon tek para birimi).

import { LOGISTICS_METHOD, logisticsGet } from "./logisticsClient";
import { defaultReportRange, reportsMock } from "./reportsMock.js";

// View açılış aralığını da sözleşme varsayılanından alır — tek kaynak.
export { defaultReportRange };

/** Uç bazında mock anahtarı (packaging.js deseni) — 17-BE yazılınca kapanır. */
export const MOCK = {
  get_operations_report: true,
  get_performance_report: true,
  get_cost_report: true,
};

/** Eksik ucu sözleşme varsayılanıyla (son 30 gün) tamamlar. */
function normalizeRange(dateFrom, dateTo) {
  const fallback = defaultReportRange();
  return { from: dateFrom || fallback.from, to: dateTo || fallback.to };
}

/** Operasyon raporu — kaç sevkiyat çıktı, ne durumdalar (L1 paneli). */
export async function getOperationsReport({ dateFrom, dateTo } = {}) {
  const { from, to } = normalizeRange(dateFrom, dateTo);
  if (MOCK.get_operations_report) return reportsMock.operations(from, to);
  return logisticsGet(`${LOGISTICS_METHOD.REPORTS}.get_operations_report`, {
    date_from: from,
    date_to: to,
  });
}

/** Performans raporu — hız ve SLA (L2 paneli). */
export async function getPerformanceReport({ dateFrom, dateTo } = {}) {
  const { from, to } = normalizeRange(dateFrom, dateTo);
  if (MOCK.get_performance_report) return reportsMock.performance(from, to);
  return logisticsGet(`${LOGISTICS_METHOD.REPORTS}.get_performance_report`, {
    date_from: from,
    date_to: to,
  });
}

/** Maliyet raporu — `view.logistics_cost` İSTER (L3 paneli, sözleşme yukarıda). */
export async function getCostReport({ dateFrom, dateTo } = {}) {
  const { from, to } = normalizeRange(dateFrom, dateTo);
  if (MOCK.get_cost_report) return reportsMock.cost(from, to);
  return logisticsGet(`${LOGISTICS_METHOD.REPORTS}.get_cost_report`, {
    date_from: from,
    date_to: to,
  });
}
