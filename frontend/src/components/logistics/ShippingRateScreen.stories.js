import zones from "@/mocks/logistics/shipping_zone.json";
import accounts from "@/mocks/logistics/carrier_account.json";
import rules from "@/mocks/logistics/pricing_rule.json";
import { deriveRule } from "@/api/pricingMock";

import ShippingRateScreen from "./ShippingRateScreen.vue";

/**
 * **K1 · Tarifeler** (TUR-121).
 *
 * Alış ve marj sütunları İKİ YÖNLÜ maskeli: platform satıcının maliyetini,
 * satıcı platformunkini görmüyor (20-FE veri sözleşmesi §7.2). Story'ler bunu
 * `asSeller` ile gösteriyor — maskeleme bir tasarım tercihi değil, bir güvenlik
 * sınırının arayüz karşılığı.
 */
export default {
  title: "Lojistik/K1 · Fiyatlandırma/Tarifeler",
  id: "logistics-k1-shipping-rates",
  component: ShippingRateScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ZONES = zones.default.data.items;
const ACCOUNTS = accounts.default.data.items;

/**
 * Türetilmiş alanlar GERÇEK fonksiyondan geliyor (`pricingMock.deriveRule`).
 *
 * Story kendi kopyasını taşısaydı mock değişince sessizce yalan söylerdi —
 * `admin-panel/CLAUDE.md` §1.1'in kendi uyarısı: "şekil saparsa story yalan söyler".
 */
const RAW = rules.default.data.items;
const ROWS = RAW.map((r) => deriveRule(r, { zones: ZONES, allRules: RAW }));

/** Satıcının GÖRECEĞİ hâl: alış/marj yalnız kendi kurallarında. */
const SELLER_ROWS = ROWS.filter((r) => !r.seller_profile || r.seller_profile === "SEL-00001").map(
  (r) =>
    r.seller_profile === "SEL-00001"
      ? r
      : { ...r, min_base_cost: undefined, max_base_cost: undefined, has_negative_margin: undefined }
);

const base = {
  rows: ROWS,
  total: "9 kayıt bulundu",
  zones: ZONES,
  accounts: ACCOUNTS,
  can: { read: true, write: true },
};

export const Default = { name: "Liste", args: base };

export const SellerView = {
  name: "Satıcı görünümü",
  args: {
    ...base,
    rows: SELLER_ROWS,
    asSeller: true,
    sellerName: "SEL-00001",
    total: "6 kayıt bulundu",
  },
};

/** Yetkisiz kullanıcı: "Yeni tarife" ve satır içi düzenleme HİÇ çizilmiyor. */
export const ReadOnly = {
  name: "Yazma yetkisi yok",
  args: { ...base, can: { read: true, write: false } },
};

export const Loading = { name: "Yükleniyor", args: { ...base, rows: [], loading: true } };

export const Empty = {
  name: "Hiç tarife yok",
  args: { ...base, rows: [], total: "0 kayıt bulundu" },
};

/** "Kayıt yok" ile "bu filtrede yok" farklı şeyler — ikincisinde filtre temizlenir. */
export const FilteredEmpty = {
  name: "Filtreli-boş",
  args: { ...base, rows: [], search: "palet", total: "0 kayıt bulundu" },
};

export const ErrorState = {
  name: "Hata",
  args: {
    ...base,
    rows: [],
    error: { code: "INTERNAL_ERROR", message: "Beklenmeyen yanıt biçimi (sözleşme zarfı yok)." },
  },
};
