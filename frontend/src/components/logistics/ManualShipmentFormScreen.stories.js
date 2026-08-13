import channels from "@/mocks/logistics/shipping_channel.json";

import ManualShipmentFormScreen from "./ManualShipmentFormScreen.vue";

/**
 * **C1 · Manuel sevkiyat formu** (TUR-107).
 *
 * Form KANALA göre şekil değiştiriyor. Aşağıdaki iki story bunu yan yana
 * gösteriyor: kargo kanalında taşıyıcı+takip no, satıcı aracı kanalında
 * sürücü+plaka soruluyor.
 */
export default {
  title: "Lojistik/KT2 · Manuel/Sevkiyat formu",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-manual-shipment-form",
  component: ManualShipmentFormScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const CHANNELS = channels.default.data.items;

export const Default = {
  name: "Kargo kanalı",
  args: {
    channels: CHANNELS,
    modelValue: {
      order: "ORD-2026-00871",
      channel: "CARGO",
      carrier: "YK",
      carrier_service: "YK-STD",
      tracking_number: "7801234567890",
      shipped_date: "2026-08-10",
      estimated_delivery_date: "2026-08-13",
      carrier_cost: 268.4,
      customer_charge: 349.9,
      cost_paid_by: "Buyer",
    },
  },
};

/** Satıcı kendi aracıyla teslim ediyor — taşıyıcı alanları HİÇ yok. */
export const SellerVehicle = {
  name: "Satıcı aracı (taşıyıcı alanı yok)",
  args: {
    channels: CHANNELS,
    modelValue: {
      order: "ORD-2026-00840",
      channel: "SELLER_VEHICLE",
      driver_name: "Hasan Kaya",
      vehicle_plate: "34 ABC 123",
      shipped_date: "2026-08-12",
      cost_paid_by: "Seller",
    },
  },
};

/** Boş form: zorunlu alan uyarısı görünür, kaydet devre dışı. */
export const Empty = {
  name: "Boş form",
  args: { channels: CHANNELS, modelValue: {} },
};

/** Tahmini teslim, sevk tarihinden önce — sessiz geçilmiyor. */
export const InvalidDateOrder = {
  name: "Uyarı · tarih sırası",
  args: {
    channels: CHANNELS,
    modelValue: {
      ...Default.args.modelValue,
      shipped_date: "2026-08-13",
      estimated_delivery_date: "2026-08-10",
    },
  },
};

/**
 * Zarar eden sevkiyat: kaydedilebilir ama operatör bunu GÖREREK yapmalı.
 * TUR-121'in alış/satış ayrımının forma yansıması.
 */
export const NegativeMargin = {
  name: "Uyarı · zarar eden sevkiyat",
  args: {
    channels: CHANNELS,
    modelValue: { ...Default.args.modelValue, carrier_cost: 420, customer_charge: 349.9 },
  },
};

export const Saving = {
  name: "Kaydediliyor",
  args: { ...Default.args, saving: true },
};
