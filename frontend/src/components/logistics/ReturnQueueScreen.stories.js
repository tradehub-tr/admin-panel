import returns from "@/mocks/logistics/return_request.json";

import ReturnQueueScreen from "./ReturnQueueScreen.vue";

/**
 * **I1 · İade kuyruğu** (TUR-116, TUR-117).
 *
 * Sözleşmedeki üç örnek talep üç farklı aşamada: karar bekleyen, kontrol
 * edilen ve kapanmış. Karar bekleyende bekleme süresi görünüyor — iade
 * talebinde yanıt gecikmesi doğrudan müşteri şikâyetine dönüşüyor.
 */
export default {
  title: "Lojistik/KT3 · İade/Kuyruk",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-return-queue",
  component: ReturnQueueScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = returns.default.data.items;
const NOW = "2026-08-12 12:00:00";

const STATUS_COUNTS = ROWS.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});

export const Default = {
  name: "Karışık aşamalar",
  args: { rows: ROWS, statusCounts: STATUS_COUNTS, now: NOW, can: { read: true, write: true } },
};

/**
 * 48 saati aşan karar bekleyişi sarı. "Şu an" ileri alınarak gecikme
 * kurgulanıyor — sabit tarihli fixture'la bu ancak böyle gösterilebilir.
 */
export const OverdueDecision = {
  name: "Gecikmiş karar",
  args: {
    rows: ROWS.filter((r) => !r.decided_at),
    statusCounts: STATUS_COUNTS,
    now: "2026-08-15 12:00:00",
    can: { read: true, write: true },
  },
};

/** Kapanmış talep: soluk ve kilit rozetli, aksiyon butonu yok. */
export const ClosedRequest = {
  name: "Kapanmış talep",
  args: {
    rows: ROWS.filter((r) => r.is_closed),
    statusCounts: STATUS_COUNTS,
    now: NOW,
    can: { read: true, write: true },
  },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { ...Default.args, can: { read: true, write: false } },
};

export const Loading = {
  name: "Yükleniyor",
  args: { rows: [], loading: true },
};

export const Empty = {
  name: "Boş",
  args: { rows: [], statusCounts: {}, can: { read: true, write: true } },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { rows: [], error: returns.error.error },
};
