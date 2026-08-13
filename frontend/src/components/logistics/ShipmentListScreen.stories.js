import shipments from "@/mocks/logistics/shipment.json";

import ShipmentListScreen from "./ShipmentListScreen.vue";

/**
 * **B1 · Sevkiyat listesi** (TUR-117).
 *
 * Gecikme durumdan AYRI gösteriliyor: bir sevkiyat "Yolda" olup aynı anda
 * gecikmiş olabilir. Tek bir "Gecikmiş" durumu uydurmak sözleşmeyi bozardı —
 * backend'de gecikme bir bayrak (`is_delayed`), durum değil.
 */
export default {
  title: "Lojistik/KT1 · Sevkiyat/Liste",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt1-shipment-list",
  component: ShipmentListScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = shipments.default.data.items;

// Sayaçlar backend'den gelir; burada fixture'dan türetiliyor ki story ile
// tablo birbirini yalanlamasın.
const STATUS_COUNTS = ROWS.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});

const MANAGER = { read: true, write: true, create: true, cancel: true };
const OPERATOR = { read: true, write: false, create: false, cancel: false };

export const Default = {
  name: "Dolu liste",
  args: {
    rows: ROWS,
    total: shipments.default.data.total,
    statusCounts: STATUS_COUNTS,
    can: MANAGER,
  },
};

export const Loading = {
  name: "Yükleniyor",
  args: { ...Default.args, rows: [], loading: true },
};

export const Empty = {
  name: "Boş",
  args: { rows: [], total: 0, statusCounts: {}, can: MANAGER },
};

/** Toplu seçim — etiket yazdır / durum güncelle alt çubukta. */
export const WithSelection = {
  name: "Toplu seçim",
  args: { ...Default.args, selection: ROWS.slice(0, 3).map((r) => r.name) },
};

/**
 * Logistics Operator: yeni sevkiyat ve toplu aksiyon butonları yok.
 * Disabled değil — hiç render edilmiyorlar.
 */
export const OperatorRole = {
  name: "Rol · operatör",
  args: { ...Default.args, can: OPERATOR },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: {
    rows: [],
    total: 0,
    statusCounts: {},
    error: shipments.error.error,
  },
};
