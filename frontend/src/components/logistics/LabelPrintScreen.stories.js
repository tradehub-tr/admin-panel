import shipments from "@/mocks/logistics/shipment.json";

import LabelPrintScreen from "./LabelPrintScreen.vue";

/**
 * **G2 · Etiket önizleme + toplu yazdırma** (TUR-114).
 *
 * Yeniden basım sayısı görünür: aynı etiketin ikinci kez basılması kargo
 * şubesinde çift kayıt riski taşıyor.
 */
export default {
  title: "Lojistik/KT2 · Paketleme/Etiket yazdırma",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-label-print",
  component: LabelPrintScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const DETAIL = shipments.detail.data;
const PACKAGES = DETAIL.packages;

export const Default = {
  name: "Etiketleri hazır",
  args: {
    shipmentName: DETAIL.name,
    packages: PACKAGES,
    reprintCounts: {},
    can: { read: true, write: true },
  },
};

/** Bir koli etiketsiz — uyarı üstte, o kart sarı çerçeveli. */
export const PartiallyLabeled = {
  name: "Uyarı · etiketsiz koli",
  args: {
    ...Default.args,
    packages: PACKAGES.map((pkg, index) =>
      index === 0 ? { ...pkg, label_url: null, label_printed_at: null } : pkg
    ),
  },
};

/** Aynı etiket üç kez basılmış — sarı not beliriyor. */
export const Reprinted = {
  name: "Yeniden basılmış etiket",
  args: {
    ...Default.args,
    reprintCounts: { [PACKAGES[0].package_code]: 3 },
  },
};

/** Hiçbiri basılmamış — toplu yazdırma bu ekranın asıl işi. */
export const NonePrinted = {
  name: "Hiç basılmamış",
  args: {
    ...Default.args,
    packages: PACKAGES.map((pkg) => ({ ...pkg, label_url: null, label_printed_at: null })),
  },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { ...Default.args, can: { read: true, write: false } },
};
