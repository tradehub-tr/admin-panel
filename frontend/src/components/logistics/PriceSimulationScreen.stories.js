import { simulateSync } from "@/api/pricingMock";
import zones from "@/mocks/logistics/shipping_zone.json";

import PriceSimulationScreen from "./PriceSimulationScreen.vue";

/**
 * **K3 · Fiyat simülasyonu** (TUR-121).
 *
 * TUR-121'in "açıklanabilir olmalı" kriteri, sonucu göstermekle DEĞİL
 * GEREKÇEYİ göstermekle karşılanıyor: hangi kural uygulandı, hangileri neden
 * elendi. "Eşleşmedi" tek başına yöneticinin kuralı düzeltmesine yaramaz.
 *
 * Veriler MOCK'UN KENDİSİNDEN geliyor — story sabit bir yanıt uydurmuyor,
 * gerçek motoru çalıştırıyor. Uydurma yanıt, motor değişince sessizce eskirdi.
 */
export default {
  title: "Lojistik/K3 · Fiyatlandırma/Simülasyon",
  id: "logistics-k3-price-simulation",
  component: PriceSimulationScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ZONES = zones.default.data.items;
const SELLER = { asSeller: true, sellerName: "SEL-00001" };

// SENKRON çekirdek: story'ler `await` kullanamıyor (build hedefi es2020,
// top-level await derlenmiyor — 2026-08-21'de ölçüldü). `simulateSync`
// `simulatePrice`'ın AYNI kodu; story kendi hesabını yazmıyor.
const NORMAL = simulateSync(
  { desi: 42, weight_kg: 38.5, zone: "TR-DOGU", order_total: 4200, seller_profile: "SEL-00001" },
  SELLER
);
const ZORUNLU = simulateSync(
  { desi: 42, weight_kg: 38.5, zone: "TR-DOGU", order_total: 6000, seller_profile: "SEL-00001" },
  SELLER
);
const ESLESMEDI = simulateSync(
  { desi: 220, weight_kg: 310, zone: "TR-ADA", order_total: 900, seller_profile: "SEL-00001" },
  SELLER
);
const SEVKIYAT = simulateSync({ shipment: "SHP-2026-00042" }, SELLER);

const arg = (sonuc, extra = {}) => ({
  quotes: sonuc.quotes,
  evaluations: sonuc.quotes.find((q) => q.carrier_account === sonuc.recommended)?.evaluations ?? [],
  recommended: sonuc.recommended,
  input: sonuc.input,
  zones: ZONES,
  can: { read: true, write: true },
  ...extra,
});

export const FreeInput = { name: "Serbest deneme", args: arg(NORMAL) };

/** Değerler siparişten OTOMATİK doldu — destek elle kopyalamıyor. */
export const RealOrder = {
  name: "Gerçek sipariş",
  args: arg(SEVKIYAT, {
    mode: "real",
    shipment: "SHP-2026-00042",
    shipments: [{ shipment: "SHP-2026-00042", destination_city: "Ankara" }],
  }),
};

/**
 * K1 kararının en kritik anı: 6.000 ₺ sipariş → platform kampanyası devreye
 * giriyor ve satıcının tarifesi uygulanmıyor. İzde bu kural KIRMIZI görünüyor,
 * sessizce kaybolmuyor.
 */
export const OverriddenByMandatory = { name: "Zorunlu kural ezdi", args: arg(ZORUNLU) };

/** Boş sonuç yok: neden hiçbir kuralın uymadığı sırayla anlatılıyor. */
export const NoRuleMatched = { name: "Hiçbir kural eşleşmedi", args: arg(ESLESMEDI) };

/** Platform gözü: satıcının hesaplarında alış ve marj sütunları maskeli. */
export const PlatformView = { name: "Platform görünümü", args: arg(NORMAL, { showCost: false }) };

export const Running = { name: "Hesaplanıyor", args: arg(NORMAL, { quotes: [], running: true }) };

export const NotRunYet = {
  name: "Henüz çalıştırılmadı",
  args: arg(NORMAL, { quotes: [], input: null }),
};

export const ErrorState = {
  name: "Hata · özellik kapalı",
  args: arg(NORMAL, {
    quotes: [],
    error: {
      code: "FEATURE_DISABLED",
      message: "Bölge bazlı fiyatlandırma kapalı (shipping_zone_pricing_enabled).",
    },
  }),
};
