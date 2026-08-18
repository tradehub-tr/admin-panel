import shipments from "@/mocks/logistics/shipment.json";

import ManualStatusUpdateScreen from "./ManualStatusUpdateScreen.vue";
import { ALLOWED_TRANSITIONS } from "./shipmentTransitions";

/**
 * **C2 · Manuel durum güncelleme** (TUR-107).
 *
 * Gerekçe zorunlu ve en az 10 karakter: "düzeltme" yazıp geçmek denetim
 * kaydını işe yaramaz hâle getirirdi. Terminal durumda geçiş listesi hiç
 * gösterilmiyor — geçersiz seçenek sunup kaydederken reddetmekten dürüst.
 *
 * Hedef durum seçici `hdr-btn-outlined` tabanlı; seçili düğme marka
 * vurgusunu scoped SCSS'ten alıyor (`.status-choice.is-selected`). Seçim
 * ekranın İÇ state'i, prop değil — story'de düğmeye tıklanarak denenir.
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

// Geçiş haritası `shipmentTransitions.js`'ten geliyor — o dosya
// `constants.py`'nin testle doğrulanan kopyası.
//
// Burada ELLE yazılmış bir harita vardı ve sözleşmeden sapmıştı: "Picked Up"
// ve "At Warehouse"ta olmayan `Failed` geçişini sunuyor, "In Transit"te
// `Delivered`ı ve her yerde `Cancelled`ı gizliyordu. Yani tasarım incelemesi
// yanlış bir ekranı onaylıyordu. Sabit tek kaynağa bağlandı.

const IN_TRANSIT = shipments.default.data.items.find((s) => s.status === "In Transit");
const DELIVERED = shipments.default.data.items.find((s) => s.status === "Delivered");
const FAILED = shipments.default.data.items.find((s) => s.status === "Failed");

export const Default = {
  name: "Yolda → beş seçenek",
  args: { shipment: IN_TRANSIT, allowedTransitions: ALLOWED_TRANSITIONS },
};

/** Terminal durum: geçiş listesi yok, sebebi yazılı. */
export const TerminalBlocked = {
  name: "Terminal durum (geçiş yok)",
  args: { shipment: DELIVERED, allowedTransitions: ALLOWED_TRANSITIONS },
};

/** Başarısız sevkiyat yeniden yola çıkabilir, iade edilebilir ya da iptal edilebilir. */
export const FailedShipment = {
  name: "Başarısız → yolda / iade / iptal",
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
