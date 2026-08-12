import codes from "@/mocks/logistics/shipment_exception_code.json";
import shipments from "@/mocks/logistics/shipment.json";

import ExceptionQueueScreen from "./ExceptionQueueScreen.vue";

/**
 * **A3 · İstisna kuyruğu** (TUR-113, TUR-118).
 *
 * TUR-113 kabul kriteri: *"İstisna kaydı çözüm notu olmadan kapatılamaz."*
 * Bu ekran çözümü BAŞLATIR; notu toplayan diyalog container'ın işi ve asıl
 * doğrulama backend'de — sunum katmanı tek başına zorunluluk garanti edemez.
 *
 * Çözülmüş istisnalar listeden kaybolmuyor: aynı sevkiyatta tekrar edip
 * etmediği ancak geçmiş görünürse anlaşılır.
 */
export default {
  title: "Lojistik/KT1 · Kuyruk/İstisnalar",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt1-exception-queue",
  component: ExceptionQueueScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

// İstisna ÖRNEKLERİ için ayrı fixture yok — kod kataloğu (sözleşmeden
// üretilmiş) ile sevkiyat fixture'ı eşleştiriliyor. Kod, ad ve önem
// derecesi böylece uydurma değil, seed verisinin aynısı.
const CODES = codes.default.data.items;
const SHIPMENTS = shipments.default.data.items;

const OCCURRED = [
  "2026-08-12 08:40:00",
  "2026-08-11 16:05:00",
  "2026-08-11 09:20:00",
  "2026-08-10 14:55:00",
];

const ROWS = CODES.slice(0, 4).map((code, index) => ({
  name: `EXC-2026-0000${index + 1}`,
  shipment: SHIPMENTS[index % SHIPMENTS.length].name,
  carrier: SHIPMENTS[index % SHIPMENTS.length].carrier,
  exception_code: code.exception_code,
  exception_label: code.exception_name,
  severity: code.severity,
  description: code.exception_category,
  occurred_at: OCCURRED[index],
  resolved_at: null,
  resolved_by: null,
  resolution_note: null,
}));

const SEVERITY_COUNTS = ROWS.reduce((acc, row) => {
  acc[row.severity] = (acc[row.severity] ?? 0) + 1;
  return acc;
}, {});

export const Default = {
  name: "Açık istisnalar",
  args: {
    rows: ROWS,
    severityCounts: SEVERITY_COUNTS,
    can: { read: true, write: true },
  },
};

/**
 * Kritik istisna en üstte — 3 gün önceki kritik bir kayıt, 5 dakika önceki
 * bilgi notundan daha acil. Sıralama zaman değil önem öncelikli.
 */
export const CriticalFirst = {
  name: "Kritik önce",
  args: {
    rows: [...ROWS].reverse(),
    severityCounts: SEVERITY_COUNTS,
    can: { read: true, write: true },
  },
};

/** Çözülmüşler soluk ve altta; çözüm notu ve çözen kişi görünür. */
export const WithResolved = {
  name: "Çözülmüş kayıtlar dahil",
  args: {
    rows: ROWS.map((row, index) =>
      index % 2 === 0
        ? row
        : {
            ...row,
            resolved_at: "2026-08-12 10:15:00",
            resolved_by: "operasyon@istoc.com",
            resolution_note: "Alıcı ile telefonda görüşüldü, adres düzeltildi.",
          }
    ),
    severityCounts: SEVERITY_COUNTS,
    can: { read: true, write: true },
  },
};

/** Operatör: "Çözümle" butonu yok. */
export const OperatorRole = {
  name: "Rol · operatör",
  args: { ...Default.args, can: { read: true, write: false } },
};

export const AllClear = {
  name: "Açık istisna yok",
  args: { rows: [], severityCounts: {}, can: { read: true, write: true } },
};

export const Loading = {
  name: "Yükleniyor",
  args: { rows: [], severityCounts: {}, loading: true },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { rows: [], severityCounts: {}, error: shipments.error.error },
};
