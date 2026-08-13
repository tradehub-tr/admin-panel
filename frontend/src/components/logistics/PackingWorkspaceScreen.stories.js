import shipments from "@/mocks/logistics/shipment.json";

import PackingWorkspaceScreen from "./PackingWorkspaceScreen.vue";

/**
 * **G1 · Paketleme çalışma alanı** (TUR-114).
 *
 * Fixture'daki sevkiyat 2 kalem / 3 koli taşıyor. Story'ler paketlemenin
 * tamamlanmış, yarım kalmış ve numaralandırması bozulmuş hâllerini ayrı
 * ayrı gösteriyor.
 */
export default {
  title: "Lojistik/KT2 · Paketleme/Çalışma alanı",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt2-packing-workspace",
  component: PackingWorkspaceScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const DETAIL = shipments.detail.data;
const ITEMS = DETAIL.items;

/** Tüm sevk miktarı paketlenmiş. */
const FULLY_PACKED = Object.fromEntries(ITEMS.map((item) => [item.item, item.shipped_qty]));

/** İkinci kalemin yarısı paketlenmiş. */
const PARTIALLY_PACKED = {
  ...FULLY_PACKED,
  [ITEMS[1].item]: Math.floor(Number(ITEMS[1].shipped_qty) / 2),
};

export const Default = {
  name: "Tamamlanmış paketleme",
  args: {
    shipmentName: DETAIL.name,
    items: ITEMS,
    packages: DETAIL.packages,
    packedQuantities: FULLY_PACKED,
    can: { read: true, write: true },
  },
};

/** Kalan kalem var — uyarı en üstte, atama butonu beliriyor. */
export const Unpacked = {
  name: "Uyarı · paketlenmemiş kalem",
  args: {
    ...Default.args,
    packedQuantities: PARTIALLY_PACKED,
  },
};

/**
 * "1/5" etiketi ama gerçekte 3 koli var: kargo şubesinde eksik koli
 * aranır. Sessiz geçilecek bir tutarsızlık değil.
 */
export const SequenceMismatch = {
  name: "Uyarı · X/Y numaralandırması bozuk",
  args: {
    ...Default.args,
    packages: DETAIL.packages.map((pkg, index) => ({
      ...pkg,
      sequence_label: `${index + 1}/5`,
    })),
  },
};

/** Hiç koli oluşturulmamış — her kalem paketlenmeyi bekliyor. */
export const NoPackages = {
  name: "Koli yok",
  args: {
    shipmentName: DETAIL.name,
    items: ITEMS,
    packages: [],
    packedQuantities: {},
    can: { read: true, write: true },
  },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { ...Default.args, can: { read: true, write: false } },
};
