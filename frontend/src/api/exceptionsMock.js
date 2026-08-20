// İstisna kuyruğu MOCK verisi ve davranışı (A3 · TUR-113/118).
//
// AYRI DOSYA (tam denetim Tur-3, 2026-08-20): `exceptions.js` tek geçit
// (`logisticsClient`) üzerinden `@/utils/api`'ye bağlanıyor ve o alias yalnız
// Vite'ta çözülüyor — node:test import edemiyor. `packagingMock`/`podMock`
// ile aynı gerekçe: mock saf kalır (yalnız `logisticsEnvelope`'a bağımlı),
// böylece `__tests__/exceptionsMock.test.js` GERÇEK kodu çağırarak mock
// davranışını kilitler. `exceptions.js` buradan tüketir ve `resetMockData`'yı
// yeniden dışa açar — çağıranların import yolu değişmedi.

// Uzantı AÇIK yazılıyor: bu dosya node:test tarafından da import ediliyor ve
// Node ESM uzantısız yolu çözmüyor (podMock/packagingMock ile aynı kural).
import { LogisticsApiError } from "./logisticsEnvelope.js";

// ---------------------------------------------------------------------------
// Mock veri — deterministik. Çözülmüş bir kayıt bilinçli olarak var:
// "çözülenler listeden kaybolmaz, soluklaşır" davranışı görünsün.
// ---------------------------------------------------------------------------

const MOCK_ITEMS = [
  {
    name: "SHEX-00001",
    shipment: "SHP-2026-00058",
    exception_code: "DELIVERY_FAILED",
    exception_label: "Teslimat başarısız",
    description: "Alıcı adreste bulunamadı — 2. deneme planlanmalı.",
    severity: "Critical",
    carrier: "Yurtiçi Kargo",
    occurred_at: "2026-08-18 09:15:00",
    resolved_at: null,
    resolved_by: null,
    resolution_note: null,
  },
  {
    name: "SHEX-00002",
    shipment: "SHP-2026-00054",
    exception_code: "ADDRESS_INVALID",
    exception_label: "Adres doğrulanamadı",
    description: "İl/ilçe eşleşmiyor; alıcıdan teyit gerekiyor.",
    severity: "Critical",
    carrier: "MNG Kargo",
    occurred_at: "2026-08-19 08:40:00",
    resolved_at: null,
    resolved_by: null,
    resolution_note: null,
  },
  {
    name: "SHEX-00003",
    shipment: "SHP-2026-00059",
    exception_code: "CARRIER_WEBHOOK_ERROR",
    exception_label: "Taşıyıcı bildirimi işlenemedi",
    description: "Durum eşlemesinde karşılık yok: 'XD-77'.",
    severity: "Warning",
    carrier: "Aras Kargo",
    occurred_at: "2026-08-19 10:05:00",
    resolved_at: null,
    resolved_by: null,
    resolution_note: null,
  },
  {
    name: "SHEX-00004",
    shipment: "SHP-2026-00051",
    exception_code: "PICKUP_MISSED",
    exception_label: "Toplama randevusu kaçtı",
    description: null,
    severity: "Info",
    carrier: "PTT Kargo",
    occurred_at: "2026-08-17 16:30:00",
    resolved_at: "2026-08-18 11:00:00",
    resolved_by: "operator@istoc.demo",
    resolution_note: "Yeni randevu alındı, sürücü bilgilendirildi.",
  },
];

// mockResolve module-level MOCK_ITEMS'ı KALICI mutasyona uğratıyordu ve geri
// dönüş yoktu — bir demo/test oturumunda çözülen kayıt sonraki senaryoya
// sızıyordu. İki seçenekten packagingMock'taki `resetMockData` deseninin
// minimal karşılığı seçildi ("mutasyonu kopyaya uygula" DEĞİL): çözülen
// kaydın oturum içinde çözülü KALMASI mock'un istenen davranışı ("çözülenler
// kaybolmaz, soluklaşır" — üstteki not); her çağrıda taze kopya o davranışı
// silerdi. Tohum dokunulmaz, çalışma kümesi derin kopyadan başlar.
const seedCopy = () => MOCK_ITEMS.map((item) => ({ ...item }));
let mockItems = seedCopy();

/** Mock durumunu tohuma döndürür (packagingMock.resetMockData deseni). */
export function resetMockData() {
  mockItems = seedCopy();
}

function mockList(severity) {
  const items = severity ? mockItems.filter((i) => i.severity === severity) : [...mockItems];
  const counts = { Critical: 0, Warning: 0, Info: 0 };
  for (const item of mockItems) counts[item.severity] = (counts[item.severity] ?? 0) + 1;
  return { severity_counts: counts, items, total: items.length };
}

function mockResolve(name, note) {
  if (!note?.trim()) {
    throw new LogisticsApiError({
      code: "VALIDATION_FAILED",
      message: "Çözüm notu zorunludur (TUR-113).",
    });
  }
  const item = mockItems.find((i) => i.name === name);
  if (!item) throw new LogisticsApiError({ code: "NOT_FOUND", message: `İstisna yok: ${name}` });
  item.resolved_at = new Date().toISOString().slice(0, 19).replace("T", " ");
  item.resolved_by = "siz (demo)";
  item.resolution_note = note.trim();
  return { name, resolved_at: item.resolved_at };
}

export const exceptionsMock = { list: mockList, resolve: mockResolve };
