import shipments from "@/mocks/logistics/shipment.json";

import SellerDeliveryScreen from "./SellerDeliveryScreen.vue";

/**
 * **D1 · Satıcı teslimatı izleme** (TUR-108).
 *
 * Kargo kanalındaki sevkiyatın aksine taşıyıcı ve takip no yok; sürücü,
 * plaka ve randevu var. Atanmamış alanlar sarı — teslimat günü gelip
 * sürücü atanmamışsa bu bir eksiklik, "boş veri" değil.
 *
 * Teslim kodunun DEĞERİ hiçbir story'de yok: sözleşme yalnız durumu
 * döndürüyor, mock'a örnek bir kod koymak onu normalleştirirdi.
 */
export default {
  title: "Lojistik/KT2 · Teslimat/Satıcı aracı",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-seller-delivery",
  component: SellerDeliveryScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const BASE = shipments.default.data.items[0];
const NOW = "2026-08-12 12:00:00";

const ROWS = [
  {
    ...BASE,
    name: "SHP-2026-00050",
    status: "Out for Delivery",
    channel: "SELLER_VEHICLE",
    carrier: null,
    tracking_number: null,
    driver_name: "Hasan Kaya",
    driver_phone: "+90 532 000 00 00",
    vehicle_plate: "34 ABC 123",
    appointment_at: "2026-08-12 14:00:00",
    appointment_window: "14:00-16:00",
    delivery_code_status: "pending",
    delivery_code_attempts: 0,
  },
  // Randevusu geçmiş ve hâlâ yolda: kırmızı randevu rozeti.
  {
    ...BASE,
    name: "SHP-2026-00051",
    status: "In Transit",
    channel: "SELLER_VEHICLE",
    carrier: null,
    tracking_number: null,
    driver_name: "Murat Şen",
    driver_phone: "+90 533 000 00 00",
    vehicle_plate: "06 XYZ 987",
    appointment_at: "2026-08-12 09:00:00",
    appointment_window: "09:00-11:00",
    delivery_code_status: "failed",
    delivery_code_attempts: 3,
  },
  // Sürücü ve plaka atanmamış, randevu da yok — üç sarı işaret.
  {
    ...BASE,
    name: "SHP-2026-00052",
    status: "Pending",
    channel: "SELLER_VEHICLE",
    carrier: null,
    tracking_number: null,
    driver_name: null,
    driver_phone: null,
    vehicle_plate: null,
    appointment_at: null,
    appointment_window: null,
    delivery_code_status: "not_required",
    delivery_code_attempts: 0,
  },
];

export const Default = {
  name: "Karışık durumlar",
  args: { rows: ROWS, now: NOW, can: { read: true, write: true } },
};

/** Randevusu geçmiş teslimat — kırmızı rozet tek başına görünür. */
export const MissedAppointment = {
  name: "Randevu kaçırıldı",
  args: { rows: [ROWS[1]], now: NOW, can: { read: true, write: true } },
};

/** Atanmamış sürücü/plaka/randevu — hepsi sarı. */
export const Unassigned = {
  name: "Atama yapılmamış",
  args: { rows: [ROWS[2]], now: NOW, can: { read: true, write: true } },
};

export const OperatorRole = {
  name: "Rol · operatör",
  args: { rows: ROWS, now: NOW, can: { read: true, write: false } },
};

export const Loading = {
  name: "Yükleniyor",
  args: { rows: [], loading: true },
};

export const Empty = {
  name: "Boş",
  args: { rows: [], can: { read: true, write: true } },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { rows: [], error: shipments.error.error },
};
