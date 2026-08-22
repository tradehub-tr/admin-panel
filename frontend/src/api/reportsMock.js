// Rapor MOCK verisi ve davranışı (L1–L3 · TUR-121, 17-FE).
//
// AYRI DOSYA (exceptionsMock/packagingMock deseni): `reports.js` tek geçit
// (`logisticsClient`) üzerinden `@/utils/api`'ye bağlanıyor ve o alias yalnız
// Vite'ta çözülüyor — node:test import edemiyor. Mock saf kalır (hiçbir
// bağımlılığı yok), böylece `__tests__/reportsMock.test.js` GERÇEK kodu
// çağırarak tutarlılık sözlerini kilitler.
//
// TASARIM — GÜN BAZLI TEK TOHUM:
//   Üç rapor da aynı gün×taşıyıcı hücrelerinden TOPLANIYOR. Böylece
//   "toplam = kırılımların toplamı" ve "operasyon raporu ile performans
//   raporu aynı sevkiyat sayısını söyler" garantisi hesapla değil YAPIYLA
//   sağlanıyor — üç ayrı elle yazılmış sabit er geç birbirinden kayardı.
//   Hücre değerleri tarih+taşıyıcı metninden türetilen deterministik bir
//   hash'ten geliyor (Math.random YASAK): aynı aralık her çağrıda aynı
//   raporu üretir, testler sayı sabitleyebilir.

/** Diğer lojistik mock'larıyla uyumlu taşıyıcı adları (pendingWork.js vb.). */
export const REPORT_CARRIERS = Object.freeze([
  "Yurtiçi Kargo",
  "Aras Kargo",
  "MNG Kargo",
  "PTT Kargo",
]);

// Para KURUŞ cinsinden tamsayı tutuluyor: marj = tahsilat − maliyet eşitliği
// float yuvarlamasına kurban gitmesin (cost mock'unun ana sözü bu).
// MNG bilinçli ZARARDA (maliyet > tahsilat): L3'ün "zarar eden kırılım"
// şeridi gerçek veriye bağlanmadan da görünür olsun.
const PROFILES = Object.freeze([
  { carrier: "Yurtiçi Kargo", base: 6, avgDays: 1.8, costKurus: 6250, chargeKurus: 7900 },
  { carrier: "Aras Kargo", base: 5, avgDays: 2.2, costKurus: 5800, chargeKurus: 7200 },
  { carrier: "MNG Kargo", base: 4, avgDays: 3.1, costKurus: 7100, chargeKurus: 6900 },
  { carrier: "PTT Kargo", base: 3, avgDays: 2.6, costKurus: 4990, chargeKurus: 6400 },
]);

const round2 = (v) => Math.round(v * 100) / 100;
const round4 = (v) => Math.round(v * 10000) / 10000;
const tl = (kurus) => kurus / 100;

/** Deterministik küçük hash — tarih+taşıyıcı → 0..996. */
function hash(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return h;
}

/** `YYYY-MM-DD` → UTC Date; geçersizse null. */
function parseDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const toDay = (date) => date.toISOString().slice(0, 10);

/**
 * Aralıktaki günler (iki uç DAHİL). Geçersiz ya da ters aralık boş liste —
 * mock "sunucu boş rapor döndürdü" gibi davranır, fırlatmaz: FE zaten ters
 * aralığı formda engelliyor, buraya düşerse boş durum doğru cevap.
 */
function listDays(from, to) {
  const start = parseDay(from);
  const end = parseDay(to);
  if (!start || !end || start > end) return [];
  const days = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) days.push(toDay(new Date(t)));
  return days;
}

/**
 * Varsayılan aralık: SON 30 GÜN (bugün dahil) — sözleşme varsayılanıyla aynı
 * (bkz. api/reports.js). View açılış değerlerini de buradan alır.
 */
export function defaultReportRange(today = new Date()) {
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const start = new Date(end.getTime() - 29 * 86_400_000);
  return { from: toDay(start), to: toDay(end) };
}

/** Tek gün×taşıyıcı hücresi — üç raporun ortak tohumu. */
function dayCell(day, profile) {
  const h = hash(`${day}|${profile.carrier}`);
  const shipments = profile.base + (h % 4);
  const failed = h % 5 === 0 ? 1 : 0;
  const cancelled = h % 7 === 0 ? 1 : 0;
  const inTransit = h % 3 === 0 ? 1 : 0;
  const delivered = shipments - failed - cancelled - inTransit;
  const onTime = Math.max(0, delivered - (h % 2));
  const avgDays = profile.avgDays + (h % 10) / 10;
  return { shipments, delivered, failed, cancelled, inTransit, onTime, avgDays };
}

/** Aralığı taşıyıcı ve gün eksenlerinde toplar — raporlar bundan türetiliyor. */
function aggregate(from, to) {
  const days = listDays(from, to);
  const byCarrier = PROFILES.map((profile) => {
    const acc = {
      profile,
      shipments: 0,
      delivered: 0,
      failed: 0,
      cancelled: 0,
      inTransit: 0,
      onTime: 0,
      daysWeighted: 0, // Σ(avgDays × delivered) — oran değil, ağırlıklı toplam
    };
    for (const day of days) {
      const cell = dayCell(day, profile);
      acc.shipments += cell.shipments;
      acc.delivered += cell.delivered;
      acc.failed += cell.failed;
      acc.cancelled += cell.cancelled;
      acc.inTransit += cell.inTransit;
      acc.onTime += cell.onTime;
      acc.daysWeighted += cell.avgDays * cell.delivered;
    }
    return acc;
  });
  const trend = days.map((day) => {
    let delivered = 0;
    let daysWeighted = 0;
    for (const profile of PROFILES) {
      const cell = dayCell(day, profile);
      delivered += cell.delivered;
      daysWeighted += cell.avgDays * cell.delivered;
    }
    return { date: day, delivered, avg_days: delivered ? round2(daysWeighted / delivered) : 0 };
  });
  return { byCarrier, trend };
}

const sum = (rows, field) => rows.reduce((acc, row) => acc + row[field], 0);

/** Zamanında oranı TESLİM EDİLENLER üzerinden — sevkiyat sayısı değil. */
const onTimeRate = (rows) => {
  const delivered = sum(rows, "delivered");
  return delivered ? round4(sum(rows, "onTime") / delivered) : 0;
};

function operations(from, to) {
  const { byCarrier } = aggregate(from, to);
  return {
    totals: {
      shipments: sum(byCarrier, "shipments"),
      delivered: sum(byCarrier, "delivered"),
      cancelled: sum(byCarrier, "cancelled"),
      failed: sum(byCarrier, "failed"),
      on_time_rate: onTimeRate(byCarrier),
    },
    // Anahtarlar Shipment durum adları — ekran `logistics.status.*`
    // çevirileriyle etiketliyor.
    by_status: {
      Delivered: sum(byCarrier, "delivered"),
      "In Transit": sum(byCarrier, "inTransit"),
      Failed: sum(byCarrier, "failed"),
      Cancelled: sum(byCarrier, "cancelled"),
    },
    by_carrier: byCarrier.map((row) => ({
      carrier: row.profile.carrier,
      count: row.shipments,
      delivered: row.delivered,
      failed: row.failed,
    })),
  };
}

function performance(from, to) {
  const { byCarrier, trend } = aggregate(from, to);
  const delivered = sum(byCarrier, "delivered");
  return {
    avg_delivery_days: delivered ? round2(sum(byCarrier, "daysWeighted") / delivered) : 0,
    on_time_rate: onTimeRate(byCarrier),
    // SLA ihlali = geç teslim edilenler + hiç teslim edilemeyenler.
    sla_breaches: delivered - sum(byCarrier, "onTime") + sum(byCarrier, "failed"),
    by_carrier: byCarrier.map((row) => ({
      carrier: row.profile.carrier,
      avg_days: row.delivered ? round2(row.daysWeighted / row.delivered) : 0,
      on_time_rate: row.delivered ? round4(row.onTime / row.delivered) : 0,
      shipments: row.shipments,
    })),
    trend,
  };
}

function cost(from, to) {
  const { byCarrier } = aggregate(from, to);
  const rows = byCarrier.map((row) => {
    const costKurus = row.shipments * row.profile.costKurus;
    const chargeKurus = row.shipments * row.profile.chargeKurus;
    return {
      carrier: row.profile.carrier,
      cost: tl(costKurus),
      charge: tl(chargeKurus),
      margin: tl(chargeKurus - costKurus),
      shipments: row.shipments,
      _costKurus: costKurus,
      _chargeKurus: chargeKurus,
    };
  });
  const totalCost = rows.reduce((acc, r) => acc + r._costKurus, 0);
  const totalCharge = rows.reduce((acc, r) => acc + r._chargeKurus, 0);
  for (const row of rows) {
    delete row._costKurus;
    delete row._chargeKurus;
  }
  return {
    total_carrier_cost: tl(totalCost),
    total_customer_charge: tl(totalCharge),
    margin: tl(totalCharge - totalCost),
    by_carrier: rows,
  };
}

// `view.logistics_cost` kapısı burada TAKLİT EDİLMİYOR: mock'un işi veri
// şekli, yetki kararı değil. FE zaten çifte kapılı (View yüklemez, Screen
// ErrorState çizer); canlı uç yetkisizde PERMISSION_DENIED döndürür
// (sözleşme: api/reports.js).
export const reportsMock = { operations, performance, cost };
