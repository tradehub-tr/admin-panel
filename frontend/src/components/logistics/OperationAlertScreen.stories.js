import alerts from "@/mocks/logistics/operation_alert.json";

import OperationAlertScreen from "./OperationAlertScreen.vue";

/**
 * **J3 · Operasyon alarmları** (TUR-113).
 *
 * İstisna kuyruğundan (A3) farkı: orası tek bir sevkiyatın sorunlarını
 * gösterir, burası SİSTEM seviyesindeki durumları. `affected_count` bu
 * ayrımı taşıyor — 1 takılan gönderi ile 14 başarısız istek farklı
 * müdahale ister.
 */
export default {
  title: "Lojistik/KT2 · Bildirim/Operasyon alarmları",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-operation-alerts",
  component: OperationAlertScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = alerts.default.data.items;

export const Default = {
  name: "Açık ve görülmüş alarmlar",
  args: { rows: ROWS, can: { read: true, write: true } },
};

/** Kritik alarm tek başına — kırmızı çerçeve ve etkilenen kayıt sayısı. */
export const CriticalOnly = {
  name: "Kritik alarm",
  args: { rows: ROWS.filter((r) => r.severity === "Critical"), can: { read: true, write: true } },
};

/**
 * Hepsi görülmüş: alarmlar SİLİNMİYOR, soluk gösteriliyor. Tekrar eden
 * bir alarm ancak geçmiş görünürse fark edilir.
 */
export const AllAcknowledged = {
  name: "Hepsi görülmüş",
  args: {
    rows: ROWS.map((r) => ({
      ...r,
      acknowledged_at: "2026-08-12 10:00:00",
      acknowledged_by: "operasyon@istoc.com",
    })),
    can: { read: true, write: true },
  },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { rows: ROWS, can: { read: true, write: false } },
};

export const Loading = {
  name: "Yükleniyor",
  args: { rows: [], loading: true },
};

export const AllClear = {
  name: "Alarm yok",
  args: { rows: [], can: { read: true, write: true } },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { rows: [], error: alerts.error.error },
};
