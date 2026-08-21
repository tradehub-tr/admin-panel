import accounts from "@/mocks/logistics/carrier_account.json";
import methods from "@/mocks/logistics/shipping_method.json";
import rules from "@/mocks/logistics/pricing_rule.json";
import zones from "@/mocks/logistics/shipping_zone.json";
import { emptyRule } from "@/constants/pricingTemplates";

import PricingRuleFormScreen from "./PricingRuleFormScreen.vue";

/**
 * **K4 · Kural formu** (20-FE, YENİ ekran).
 *
 * Görevin adında "CRUD" vardı ama C/U/D'nin ekranı hiç tasarlanmamıştı:
 * prototipler `create`/`edit` yayıyor, dinleyen yoktu.
 *
 * Üç mod tek bileşende — şablon seçimi, form, silme onayı. Sağdaki canlı
 * hesap KAYDETMEDEN sonucu gösteriyor ve hesabı `pricingMock`'un saf
 * çekirdeğinden alıyor; ekran kendi formülünü yazmıyor.
 */
export default {
  title: "Lojistik/K4 · Fiyatlandırma/Kural formu",
  id: "logistics-k4-pricing-rule-form",
  component: PricingRuleFormScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

const ARAS = rules.default.data.items.find((r) => r.name === "PR-ALI-ARAS-DOGU");

const base = {
  zones: zones.default.data.items,
  accounts: accounts.default.data.items,
  methods: methods.default.data.items,
  can: { read: true, write: true },
};

/** Boş formdan başlatma YOK — şablon seçimi ilk ekran (CLAUDE.md §4.14b). */
export const TemplatePicker = {
  name: "Şablon seçimi",
  args: { ...base, mode: "template", model: emptyRule() },
};

export const Filled = {
  name: "Dolu form + canlı hesap",
  args: { ...base, model: JSON.parse(JSON.stringify(ARAS)) },
};

/** Kademe çakışması: 25–30 arası iki kademede birden, aynı desi iki fiyat verir. */
export const TierOverlap = {
  name: "Kademe çakışması",
  args: {
    ...base,
    model: {
      ...JSON.parse(JSON.stringify(ARAS)),
      tiers: [
        {
          min_desi: 0,
          max_desi: 30,
          base_cost: 120,
          base_charge: 165,
          per_desi_charge: null,
          min_charge: null,
        },
        {
          min_desi: 25,
          max_desi: 50,
          base_cost: 245,
          base_charge: 320,
          per_desi_charge: 1.4,
          min_charge: null,
        },
      ],
    },
  },
};

/** Kademe boşluğu: 30–40 arası hiçbir kademeye girmiyor, o aralıkta fiyat çıkmaz. */
export const TierGap = {
  name: "Kademe boşluğu",
  args: {
    ...base,
    model: {
      ...JSON.parse(JSON.stringify(ARAS)),
      tiers: [
        {
          min_desi: 0,
          max_desi: 30,
          base_cost: 120,
          base_charge: 165,
          per_desi_charge: null,
          min_charge: null,
        },
        {
          min_desi: 40,
          max_desi: 50,
          base_cost: 245,
          base_charge: 320,
          per_desi_charge: 1.4,
          min_charge: null,
        },
      ],
    },
  },
};

/**
 * K2 kararının en sert sonucu: admin, satıcının kuralını AÇAR ama düzenleyemez.
 * Alış sütunu hiç doldurulmaz, marj hesaplanmaz, Kaydet yoktur — kalan tek
 * müdahale pasifleştirme.
 */
export const ForeignRule = {
  name: "Satıcı kuralına admin bakışı",
  args: { ...base, model: JSON.parse(JSON.stringify(ARAS)), readOnly: true, showCost: false },
};

/** Satıcı formu: "Zorunlu" anahtarı YOK, sahip kilitli. */
export const SellerForm = {
  name: "Satıcı formu",
  args: { ...base, model: JSON.parse(JSON.stringify(ARAS)), asSeller: true },
};

/** Kullanımdaki kural silinemiyor; "pasifleştir" öneriliyor. */
export const DeleteInUse = {
  name: "Silme onayı · kullanımda",
  args: { ...base, mode: "delete", model: JSON.parse(JSON.stringify(ARAS)), inUseCount: 3 },
};

export const ReadOnlyUser = {
  name: "Yazma yetkisi yok",
  args: { ...base, model: JSON.parse(JSON.stringify(ARAS)), can: { read: true, write: false } },
};

export const Loading = {
  name: "Yükleniyor",
  args: { ...base, model: emptyRule(), loading: true },
};
