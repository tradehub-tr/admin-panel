import shipments from "@/mocks/logistics/shipment.json";

import ManualStatusUpdateScreen from "./ManualStatusUpdateScreen.vue";

/**
 * **C2 · Manuel durum güncelleme** (TUR-107).
 *
 * Gerekçe zorunlu ve en az 10 karakter: "düzeltme" yazıp geçmek denetim
 * kaydını işe yaramaz hâle getirirdi. Terminal durumda geçiş listesi hiç
 * gösterilmiyor — geçersiz seçenek sunup kaydederken reddetmekten dürüst.
 */
export default {
  title: "Lojistik/KT2 · Manuel/Durum güncelleme",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-manual-status-update",
  component: ManualStatusUpdateScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

// Geçiş kuralı sözleşmeden (constants.py ALLOWED_TRANSITIONS) türetilmiş
// alt küme — ekran bunu kendisi bilmiyor, dışarıdan alıyor.
const ALLOWED_TRANSITIONS = {
  Draft: ["Pending", "Cancelled"],
  Pending: ["Ready for Pickup", "Cancelled"],
  "Ready for Pickup": ["Picked Up", "Cancelled"],
  "Picked Up": ["In Transit", "Failed"],
  "In Transit": ["At Warehouse", "Out for Delivery", "Failed"],
  "At Warehouse": ["Out for Delivery", "In Transit", "Failed"],
  "Out for Delivery": ["Delivered", "Failed"],
  Failed: ["Out for Delivery", "Returned"],
};

const IN_TRANSIT = shipments.default.data.items.find((s) => s.status === "In Transit");
const DELIVERED = shipments.default.data.items.find((s) => s.status === "Delivered");
const FAILED = shipments.default.data.items.find((s) => s.status === "Failed");

export const Default = {
  name: "Yolda → üç seçenek",
  args: { shipment: IN_TRANSIT, allowedTransitions: ALLOWED_TRANSITIONS },
};

/** Terminal durum: geçiş listesi yok, sebebi yazılı. */
export const TerminalBlocked = {
  name: "Terminal durum (geçiş yok)",
  args: { shipment: DELIVERED, allowedTransitions: ALLOWED_TRANSITIONS },
};

/** Başarısız sevkiyat yeniden dağıtıma ya da iadeye gidebilir. */
export const FailedShipment = {
  name: "Başarısız → yeniden dağıtım / iade",
  args: { shipment: FAILED, allowedTransitions: ALLOWED_TRANSITIONS },
};

/** Geçiş tanımı olmayan durum — ekran boş liste yerine sebebini söylüyor. */
export const NoTransitionDefined = {
  name: "Tanımlı geçiş yok",
  args: { shipment: IN_TRANSIT, allowedTransitions: {} },
};

export const Saving = {
  name: "Kaydediliyor",
  args: { ...Default.args, saving: true },
};
