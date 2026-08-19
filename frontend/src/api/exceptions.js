// İstisna kuyruğu API istemcisi (A3 · TUR-113/118).
//
// Backend hedefi: tradehub_core.api.v1.logistics.list_shipment_exceptions +
// resolve_shipment_exception — HENÜZ YAZILMADI (16-BE). 13-FE paketleme
// deseni: ekran bu sözleşmeyi tüketiyor, uç yazılınca ilgili MOCK satırı
// `false` yapılıyor, ekran değişmiyor.
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

import api from "@/utils/api";

import { LogisticsApiError, unwrap } from "./logistics";

/** Uç bazında mock anahtarı (packaging.js deseni). */
export const MOCK = {
  list_shipment_exceptions: true,
  resolve_shipment_exception: true,
};

const LOGISTICS = "tradehub_core.api.v1.logistics";

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

function mockList(severity) {
  const items = severity ? MOCK_ITEMS.filter((i) => i.severity === severity) : [...MOCK_ITEMS];
  const counts = { Critical: 0, Warning: 0, Info: 0 };
  for (const item of MOCK_ITEMS) counts[item.severity] = (counts[item.severity] ?? 0) + 1;
  return { severity_counts: counts, items, total: items.length };
}

function mockResolve(name, note) {
  if (!note?.trim()) {
    throw new LogisticsApiError({
      code: "VALIDATION_FAILED",
      message: "Çözüm notu zorunludur (TUR-113).",
    });
  }
  const item = MOCK_ITEMS.find((i) => i.name === name);
  if (!item) throw new LogisticsApiError({ code: "NOT_FOUND", message: `İstisna yok: ${name}` });
  item.resolved_at = new Date().toISOString().slice(0, 19).replace("T", " ");
  item.resolved_by = "siz (demo)";
  item.resolution_note = note.trim();
  return { name, resolved_at: item.resolved_at };
}

/** Aktif önem filtresine göre istisnalar + tüm sayaçlar (tek yanıt). */
export async function listShipmentExceptions({ severity = "", page = 1, pageSize = 50 } = {}) {
  if (MOCK.list_shipment_exceptions) return mockList(severity);

  return unwrap(
    await api.callMethodGET(`${LOGISTICS}.list_shipment_exceptions`, {
      ...(severity ? { severity } : {}),
      page,
      page_size: pageSize,
    })
  );
}

/** İstisnayı çözüm notuyla kapatır — not zorunlu (TUR-113). */
export async function resolveShipmentException(name, resolutionNote) {
  if (MOCK.resolve_shipment_exception) return mockResolve(name, resolutionNote);

  return unwrap(
    await api.callMethod(`${LOGISTICS}.resolve_shipment_exception`, {
      name,
      resolution_note: resolutionNote,
    })
  );
}
