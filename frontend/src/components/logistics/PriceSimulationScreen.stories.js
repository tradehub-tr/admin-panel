import quotes from "@/mocks/logistics/price_quote.json";

import PriceSimulationScreen from "./PriceSimulationScreen.vue";

/**
 * **K3 · Fiyat simülasyonu** (TUR-121).
 *
 * Değerlendirme izi bu ekranın asıl çıktısı: hangi kural uygulandı ve
 * hangileri NEDEN elendi. Sonucu göstermek "açıklanabilir olmalı"
 * kriterini karşılamaz.
 */
export default {
  title: "Lojistik/KT3 · Fiyatlandırma/Simülasyon",
  // Açık ID: başlık Türkçe kalsın ama URL ASCII ve kararlı olsun —
  // tasarım incelemesinde story linkleri paylaşılıyor.
  id: "logistics-kt3-price-simulation",
  component: PriceSimulationScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const QUOTES = quotes.default.data.items;
const STANDARD = QUOTES[0];
const FREE_SHIPPING = QUOTES.find((q) => q.customer_charge === 0) ?? QUOTES[2];

/** Elenme sebepleri kural ölçütlerinden türetilmiş — uydurma metin değil. */
const EVALUATIONS = [
  { rule: "Ücretsiz kargo · 5000 TL üzeri sipariş", matched: false, reason: "Sipariş tutarı 4.200,00 < 5.000,00" },
  { rule: "Standart Kargo · 30-50 desi", matched: true, reason: "" },
  { rule: "Doğu bölgesi ek ücreti", matched: false, reason: "Bölge TR-IC ≠ TR-DOGU" },
  { rule: "Ağır yük · 100 kg üzeri", matched: false, reason: "Kural pasif" },
];

export const Default = {
  name: "Standart tarife uygulandı",
  args: { quote: STANDARD, evaluations: EVALUATIONS },
};

/**
 * Ücretsiz kargo kuralı kazandı: müşteri ücreti 0, taşıyıcı maliyeti
 * duruyor → marj NEGATİF. Platformun bilinçli kararı ama görünür olmalı.
 */
export const FreeShippingApplied = {
  name: "Ücretsiz kargo (negatif marj)",
  args: {
    quote: FREE_SHIPPING,
    evaluations: [
      { rule: "Ücretsiz kargo · 5000 TL üzeri sipariş", matched: true, reason: "" },
      { rule: "Standart Kargo · 30-50 desi", matched: false, reason: "Daha yüksek öncelikli kural uygulandı" },
    ],
  },
};

/** Hiçbir kural eşleşmedi — yönetici hangi ölçütün tuttuğunu göremez. */
export const NoRuleMatched = {
  name: "Hiçbir kural eşleşmedi",
  args: {
    quote: { ...STANDARD, applied_rule: null, rule_priority: null, surcharges: {} },
    evaluations: EVALUATIONS.map((row) => ({
      ...row,
      matched: false,
      reason: row.reason || "Ölçüt sağlanmadı",
    })),
  },
};

/** Değerlendirme izi gelmemiş — sonuç var ama açıklama yok, sebebi yazılı. */
export const NoTrace = {
  name: "Değerlendirme izi yok",
  args: { quote: STANDARD, evaluations: [] },
};

export const NoResult = {
  name: "Henüz çalıştırılmadı",
  args: { quote: null, evaluations: [] },
};

export const Running = {
  name: "Hesaplanıyor",
  args: { quote: null, evaluations: [], running: true },
};

export const PermissionError = {
  name: "Hata · yetki yok",
  args: { quote: null, evaluations: [], error: quotes.error.error },
};
