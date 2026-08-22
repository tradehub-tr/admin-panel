import quotes from "@/mocks/logistics/price_quote.json";

import CarrierQuoteTable from "./CarrierQuoteTable.vue";

/**
 * **Taşıyıcı teklifleri** — K3 simülasyonu ve K8 etiket akışı AYNI bileşeni
 * kullanıyor.
 *
 * Kullanılamayan hesap listeden DÜŞMÜYOR: "PTT neden yok?" sorusunu boş liste
 * cevaplayamaz; sebep satırın kendisinde yazılı.
 *
 * Alış/marj sütunları maskeli olabiliyor (sözleşme §7.2) — `showCost: false`
 * story'si platformun satıcı hesabına baktığı durumu gösteriyor.
 */
export default {
  title: "Lojistik/K3 · Fiyatlandırma/Taşıyıcı teklifleri",
  id: "logistics-carrier-quote-table",
  component: CarrierQuoteTable,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const QUOTES = quotes.default.data.items;

export const Comparison = {
  name: "Karşılaştırma (K3)",
  args: { quotes: QUOTES, recommended: "CACC-AK-SEL00001" },
};

/** K8: paketleme akışında seçilebilir; varsayılan önceden işaretli. */
export const Selectable = {
  name: "Seçilebilir (K8)",
  args: {
    quotes: QUOTES.filter((q) => q.available),
    recommended: "CACC-AK-SEL00001",
    modelValue: "CACC-AK-SEL00001",
    selectable: true,
  },
};

/** Yetki yoksa alış ve marj sütunları HİÇ çizilmiyor — boş hücre değil, sütun yok. */
export const Masked = {
  name: "Maliyet maskeli",
  args: { quotes: QUOTES, recommended: "CACC-AK-SEL00001", showCost: false },
};

/** Tek uygun taşıyıcı: liste yine gösteriliyor ama seçim gereksiz. */
export const SingleOption = {
  name: "Tek taşıyıcı",
  args: {
    quotes: QUOTES.filter((q) => q.carrier_account === "CACC-AK-SEL00001"),
    recommended: "CACC-AK-SEL00001",
  },
};

/** Hiçbir hesap fiyat üretemedi — sebep her satırda yazılı. */
export const NoneAvailable = {
  name: "Uygun taşıyıcı yok",
  args: {
    quotes: QUOTES.map((q) => ({ ...q, available: 0, unavailable_reason: "NO_RULE_MATCHED" })),
    recommended: null,
  },
};
