import shipments from "@/mocks/logistics/shipment.json";

import PendingWorkQueueScreen from "./PendingWorkQueueScreen.vue";

/**
 * **A2 · Bekleyen işler kuyruğu** (TUR-117, TUR-118).
 *
 * Sevkiyat listesi "ne var?" sorusunu cevaplar; bu ekran "ne YAPMAM lazım?"
 * sorusunu. Aynı veriyi farklı kesiyor, bu yüzden listeye bir filtre daha
 * eklemek yerine ayrı ekran.
 *
 * Bekleme süresi ekranın asıl bilgisi: 24 saati aşan sarı, 72 saati aşan
 * kırmızı. Eşikler operasyonun "unutulmuş" tanımından geliyor.
 */
export default {
  title: "Lojistik/KT1 · Kuyruk/Bekleyen işler",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt1-pending-queue",
  component: PendingWorkQueueScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

// Kuyruk satırları sevkiyat fixture'ından; `waiting_hours` kuyruk API'sinin
// hesapladığı türetilmiş alan, sözleşmedeki sevkiyat alanı değil.
const WAITING_HOURS = [2, 18, 31, 76, 120];
const ROWS = shipments.default.data.items.map((row, index) => ({
  ...row,
  waiting_hours: WAITING_HOURS[index % WAITING_HOURS.length],
}));

const BUCKET_COUNTS = {
  awaiting_carrier: 2,
  awaiting_label: 5,
  awaiting_pickup: 3,
  awaiting_pod: 1,
  delayed: 4,
};

export const Default = {
  name: "Etiket bekleyenler",
  args: {
    activeBucket: "awaiting_label",
    bucketCounts: BUCKET_COUNTS,
    rows: ROWS,
    can: { read: true, write: true },
  },
};

/**
 * Boş kuyruk bir EKSİKLİK değil, iyi haber — bu yüzden gri "kayıt bulunamadı"
 * kutusu değil yeşil "temiz" paneli gösteriliyor.
 */
export const AllClear = {
  name: "Kuyruk temiz",
  args: {
    activeBucket: "awaiting_pod",
    bucketCounts: { ...BUCKET_COUNTS, awaiting_pod: 0 },
    rows: [],
    can: { read: true, write: true },
  },
};

/** Hepsi eşiğin üstünde — sarı ve kırmızı bekleme süreleri bir arada. */
export const StaleWork = {
  name: "Uzun süredir bekleyen",
  args: {
    ...Default.args,
    activeBucket: "delayed",
    rows: ROWS.map((row, index) => ({ ...row, waiting_hours: 30 + index * 40 })),
  },
};

export const WithSelection = {
  name: "Toplu seçim",
  args: { ...Default.args, selection: ROWS.slice(0, 2).map((r) => r.name) },
};

/** Operatör: toplu işlem butonu yok. */
export const OperatorRole = {
  name: "Rol · operatör",
  args: { ...Default.args, can: { read: true, write: false } },
};

export const Loading = {
  name: "Yükleniyor",
  args: { ...Default.args, rows: [], loading: true },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: {
    activeBucket: "awaiting_label",
    bucketCounts: {},
    rows: [],
    error: shipments.error.error,
  },
};
