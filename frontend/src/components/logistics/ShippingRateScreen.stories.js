import rules from "@/mocks/logistics/pricing_rule.json";

import ShippingRateScreen from "./ShippingRateScreen.vue";

/**
 * **K1 · Kargo tarifeleri** (TUR-121).
 *
 * Eşleşme ölçütleri tek bir okunabilir sütunda toplanıyor; her ölçüt için
 * ayrı sütun on kolonluk ve çoğu boş bir tablo üretirdi.
 */
export default {
  title: "Lojistik/KT3 · Fiyatlandırma/Tarifeler",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-shipping-rates",
  component: ShippingRateScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ROWS = rules.default.data.items;

export const Default = {
  name: "Dolu liste",
  args: { rows: ROWS, can: { read: true, write: true } },
};

/**
 * Zararda tarife: satış fiyatı alış maliyetinin altında. Tanımlanabilir
 * ama görünmeden değil.
 */
export const NegativeMargin = {
  name: "Uyarı · zararda tarife",
  args: {
    rows: ROWS.map((r, index) =>
      index === 1 ? { ...r, base_cost: 320, base_charge: 280 } : r
    ),
    can: { read: true, write: true },
  },
};

export const ReadOnlyRole = {
  name: "Rol · yalnız okuma",
  args: { rows: ROWS, can: { read: true, write: false } },
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
  args: { rows: [], error: rules.error.error },
};
