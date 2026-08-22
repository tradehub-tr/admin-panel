import { deriveRule } from "@/api/pricingMock";
import accounts from "@/mocks/logistics/carrier_account.json";
import rules from "@/mocks/logistics/pricing_rule.json";
import zones from "@/mocks/logistics/shipping_zone.json";

import PricingRuleScreen from "./PricingRuleScreen.vue";

/**
 * **K2 · Fiyat kuralları** (TUR-121).
 *
 * TUR-121 kabul kriteri: *"Kural çakışması deterministik çözülür ve
 * AÇIKLANABİLİR olmalıdır."* Ekran bunu üç katmanı görsel olarak ayırarak ve
 * çakışma/gölgeleme uyarılarını satırın içinde göstererek kovalıyor.
 *
 * Uyarılar SUNUCUDAN geliyor (`priority_conflict_with`, `shadowed_by`):
 * arayüzde hesaplansaydı liste sayfalandığı an yanlış söylerdi.
 */
export default {
  title: "Lojistik/K2 · Fiyatlandırma/Kurallar",
  id: "logistics-k2-pricing-rules",
  component: PricingRuleScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ZONES = zones.default.data.items;
const ACCOUNTS = accounts.default.data.items;
const RAW = rules.default.data.items;
const ALL = RAW.map((r) => deriveRule(r, { zones: ZONES, allRules: RAW }));

const group = (rows) => ({
  platform_mandatory: rows.filter((r) => r.layer === "platform_mandatory"),
  seller: rows.filter((r) => r.layer === "seller"),
  platform: rows.filter((r) => r.layer === "platform"),
});

const base = {
  byLayer: group(ALL),
  total: ALL.length,
  accounts: ACCOUNTS,
  can: { read: true, write: true },
};

export const Default = { name: "Üç katman", args: base };

/**
 * Çakışma seed'de BİLEREK var: PR-STD-YK ile PR-STD-YK-ESKI aynı katmanda
 * aynı önceliği paylaşıyor. Belirsizlik bir sözleşme ihlali, kozmetik sorun değil.
 */
export const PriorityConflict = {
  name: "Çakışan öncelik",
  args: { ...base, byLayer: group(ALL.filter((r) => r.layer === "platform")) },
};

/** Ölçütsüz bir kural her gönderiye uyar; altındakiler hiç değerlendirilmez. */
export const Shadowed = {
  name: "Gölgelenen kural",
  args: {
    ...base,
    byLayer: group(
      ALL.map((r) =>
        r.name === "PR-EAST-YK" ? { ...r, shadowed_by: "PR-STD-YK", priority_conflict_with: [] } : r
      )
    ),
  },
};

/** Satıcı: kendi katmanını yazar, platform katmanını salt-okunur görür. */
export const SellerView = {
  name: "Satıcı görünümü",
  args: {
    ...base,
    asSeller: true,
    sellerName: "SEL-00001",
    byLayer: group(ALL.filter((r) => !r.seller_profile || r.seller_profile === "SEL-00001")),
  },
};

/** Katman BOŞKEN gizlenmiyor — üç katmanlı mantık ancak böyle öğrenilir. */
export const OnlySellerRules = {
  name: "Yalnız satıcı kuralı",
  args: { ...base, byLayer: group(ALL.filter((r) => r.layer === "seller")) },
};

export const ReadOnly = {
  name: "Yazma yetkisi yok",
  args: { ...base, can: { read: true, write: false } },
};

export const Loading = {
  name: "Yükleniyor",
  args: { ...base, byLayer: {}, total: 0, loading: true },
};

export const Empty = { name: "Hiç kural yok", args: { ...base, byLayer: {}, total: 0 } };

export const ErrorState = {
  name: "Hata · yetki yok",
  args: {
    ...base,
    byLayer: {},
    error: { code: "PERMISSION_DENIED", message: "Bu kaydı görüntüleme yetkiniz yok." },
  },
};
