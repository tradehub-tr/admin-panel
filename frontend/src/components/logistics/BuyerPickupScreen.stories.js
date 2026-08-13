import shipments from "@/mocks/logistics/shipment.json";

import BuyerPickupScreen from "./BuyerPickupScreen.vue";

/**
 * **D2 · Alıcı teslim alma izleme** (TUR-108).
 *
 * Ödeme kapısı story'lerde bilinçli olarak yan yana: ödenmemiş kayıtta
 * "Teslim et" butonu HİÇ render edilmiyor, ödenmişte ediliyor. Uyarıya
 * rağmen tıklanabilen bir buton, günün sonunda tıklanır.
 */
export default {
  title: "Lojistik/KT2 · Teslimat/Alıcı teslim alma",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-buyer-pickup",
  component: BuyerPickupScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const BASE = shipments.default.data.items.find((s) => s.channel === "BUYER_PICKUP")
  ?? shipments.default.data.items[0];

const READY_PAID = {
  ...BASE,
  name: "SHP-2026-00060",
  status: "Ready for Pickup",
  channel: "BUYER_PICKUP",
  carrier: null,
  tracking_number: null,
  pickup_location: "İkitelli Depo — Kapı 3",
  appointment_at: "2026-08-13 10:00:00",
  appointment_window: "10:00-12:00",
  delivery_code_status: "verified",
  payment_required_before_delivery: 1,
  payment_status: "paid",
};

const READY_UNPAID = {
  ...READY_PAID,
  name: "SHP-2026-00061",
  pickup_location: "Ostim Depo — Kapı 1",
  delivery_code_status: "pending",
  payment_status: "unpaid",
};

const NO_PAYMENT_GATE = {
  ...READY_PAID,
  name: "SHP-2026-00062",
  pickup_location: null,
  appointment_at: null,
  delivery_code_status: "not_required",
  payment_required_before_delivery: 0,
  payment_status: "waived",
};

const DELIVERED = {
  ...READY_PAID,
  name: "SHP-2026-00059",
  status: "Delivered",
  delivery_code_status: "verified",
};

export const Default = {
  name: "Karışık durumlar",
  args: {
    rows: [READY_UNPAID, READY_PAID, NO_PAYMENT_GATE, DELIVERED],
    can: { read: true, write: true },
  },
};

/** Ödeme tamamlanmamış — teslim butonu YOK, kırmızı kapı görünür. */
export const PaymentBlocked = {
  name: "Ödeme kapısı kapalı",
  args: { rows: [READY_UNPAID], can: { read: true, write: true } },
};

/** Ödeme tamam, kod doğrulanmış — teslim butonu var. */
export const ReadyToHandOver = {
  name: "Teslime hazır",
  args: { rows: [READY_PAID], can: { read: true, write: true } },
};

/** Teslim edilmiş — teslim kanıtı butonu beliriyor. */
export const Delivered = {
  name: "Teslim edilmiş",
  args: { rows: [DELIVERED], can: { read: true, write: true } },
};

export const OperatorRole = {
  name: "Rol · operatör",
  args: { rows: [READY_PAID, READY_UNPAID], can: { read: true, write: false } },
};

export const Loading = {
  name: "Yükleniyor",
  args: { rows: [], loading: true },
};

export const Empty = {
  name: "Boş",
  args: { rows: [], can: { read: true, write: true } },
};
